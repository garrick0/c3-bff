/**
 * Projection Controller
 * Handles module dependency analysis endpoints
 */

import { Request, Response } from 'express';
import { Container } from '@garrick0/c3-wiring';
import { TOKENS } from '@garrick0/c3-wiring';
import { createSuccessResponse, createErrorResponse } from '@garrick0/c3-shared';
import type {
  GraphLoader,
  ModuleProjectionStrategy,
  ModuleAggregator,
  ModuleDependencyCalculator,
  GraphViewBuilder,
  DagreLayoutEngine,
  JSONGraphExporter,
  GraphMLExporter,
  SVGGraphExporter,
  ModuleProjection,
  Module,
  AggregationLevel,
  ViewConfiguration,
  ProjectionType
} from '@garrick0/c3-projection';
import * as path from 'path';

// In-memory cache for analyses (TODO: Replace with Redis/DB)
const analysisCache = new Map<string, any>();

/**
 * Analyze modules endpoint
 * POST /api/projections/modules/analyze
 */
export function analyzeModules(container: Container) {
  return async (req: Request, res: Response) => {
    try {
      const { rootPath, config = {} } = req.body;

      // Validation
      if (!rootPath) {
        res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'rootPath is required')
        );
        return;
      }

      if (!path.isAbsolute(rootPath)) {
        res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'rootPath must be absolute')
        );
        return;
      }

      const logger = container.get(TOKENS.LOGGER) as any;
      const graphLoader = container.get(TOKENS.GRAPH_LOADER) as any;

      logger.info('Starting module analysis', { rootPath, config });

      // Load graph
      const graph = await graphLoader.loadGraph(rootPath);

      // Import dynamically to avoid type issues
      const { ModuleProjectionStrategy, ViewConfiguration, ProjectionType, AggregationLevel } =
        await import('@garrick0/c3-projection');

      // Create projection
      const strategy = new ModuleProjectionStrategy(logger, rootPath);
      const viewConfig = ViewConfiguration.create({
        projectionType: ProjectionType.MODULE,
        aggregationLevel: config.aggregationLevel || AggregationLevel.TOP_LEVEL,
        options: {
          includeTests: config.includeTests ?? false,
          excludePatterns: config.excludePatterns || []
        }
      });

      const projection = (await strategy.project(graph, viewConfig)) as any;
      const metrics = projection.getMetrics();

      // Calculate architecture score
      const score = calculateArchitectureScore(projection);

      // Generate analysis ID
      const analysisId = `analysis-${Date.now()}`;

      // Build response data
      const modules = projection.getModules().map((m: any) => ({
        id: m.id,
        name: m.name,
        path: m.path,
        files: m.files || [],
        dependencies: m.getDependencies ? m.getDependencies() : [],
        dependents: m.getDependents ? m.getDependents() : [],
        fileCount: m.files.length,
        dependencyCount: m.getDependencyCount(),
        dependentCount: m.getDependentCount(),
        metrics: m.metrics
      }));

      const dependencies: any[] = [];
      for (const module of projection.getModules()) {
        for (const depId of module.dependencies) {
          const targetModule = projection.getModules().find((m: any) => m.id === depId);
          if (targetModule) {
            dependencies.push({
              from: module.id,
              to: targetModule.id,
              strength: 1
            });
          }
        }
      }

      const hotspots = projection
        .getModules()
        .filter((m: any) => m.getDependentCount() > 3)
        .sort((a: any, b: any) => b.getDependentCount() - a.getDependentCount())
        .slice(0, 5)
        .map((m: any) => ({
          moduleId: m.id,
          moduleName: m.name,
          usedByCount: m.getDependentCount(),
          reason: 'High usage module'
        }));

      const recommendations = [];
      if (metrics.cyclicDependencies === 0) {
        recommendations.push({
          type: 'info',
          message: 'No circular dependencies detected',
          severity: 'success'
        });
      } else {
        recommendations.push({
          type: 'warning',
          message: `${metrics.cyclicDependencies} circular ${
            metrics.cyclicDependencies === 1 ? 'dependency' : 'dependencies'
          } detected`,
          severity: 'warning'
        });
      }

      const highlyCoupled = modules.filter((m: any) => m.dependencyCount > 5);
      if (highlyCoupled.length > 0) {
        recommendations.push({
          type: 'warning',
          message: `${highlyCoupled.length} module(s) with high coupling (> 5 dependencies)`,
          severity: 'warning'
        });
      }

      const responseData = {
        analysisId,
        graphId: graph.id,
        summary: {
          totalModules: metrics.totalModules,
          totalFiles: metrics.totalFiles,
          totalDependencies: metrics.totalDependencies,
          averageCoupling: metrics.averageDependenciesPerModule,
          maxDependencies: metrics.maxDependencies,
          circularDependencies: metrics.cyclicDependencies,
          architectureScore: score
        },
        modules,
        dependencies,
        hotspots,
        issues: [],
        recommendations,
        analyzedAt: new Date().toISOString()
      };

      // Cache the analysis and projection
      analysisCache.set(analysisId, {
        ...responseData,
        projection, // Store for exports
        rootPath
      });

      logger.info('Module analysis complete', {
        analysisId,
        moduleCount: metrics.totalModules
      });

      res.json(createSuccessResponse(responseData));
    } catch (error) {
      const logger = container.get(TOKENS.LOGGER) as any;
      logger.error('Analysis failed', error as Error);
      res.status(500).json(
        createErrorResponse('ANALYSIS_ERROR', (error as Error).message)
      );
    }
  };
}

/**
 * Get module view endpoint
 * GET /api/projections/modules/:analysisId
 */
export function getModuleView(container: Container) {
  return async (req: Request, res: Response) => {
    try {
      const { analysisId } = req.params;

      const cached = analysisCache.get(analysisId);
      if (!cached) {
        res.status(404).json(
          createErrorResponse('NOT_FOUND', 'Analysis not found')
        );
        return;
      }

      // Remove projection object from response
      const { projection, ...responseData } = cached;

      res.json(createSuccessResponse(responseData));
    } catch (error) {
      const logger = container.get(TOKENS.LOGGER) as any;
      logger.error('Get module view failed', error as Error);
      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', (error as Error).message)
      );
    }
  };
}

/**
 * Export module view endpoint
 * GET /api/projections/modules/:analysisId/export?format=json|graphml|svg|markdown
 */
export function exportModuleView(container: Container) {
  return async (req: Request, res: Response) => {
    try {
      const { analysisId } = req.params;
      const { format = 'json', layout = 'TB', colorScheme = 'dependencies' } = req.query;

      const cached = analysisCache.get(analysisId);
      if (!cached) {
        res.status(404).json(
          createErrorResponse('NOT_FOUND', 'Analysis not found')
        );
        return;
      }

      const logger = container.get(TOKENS.LOGGER) as any;
      const viewBuilder = container.get(TOKENS.GRAPH_VIEW_BUILDER) as any;
      const layoutEngine = container.get(TOKENS.LAYOUT_ENGINE) as any;

      // Build and layout graph view
      const graphView = viewBuilder.build(cached.projection, {
        includeMetrics: true,
        colorScheme: colorScheme as string,
        nodeSize: 'proportional'
      });

      await layoutEngine.layout(graphView);

      let content: any;
      let filename: string;

      switch (format) {
        case 'json': {
          const jsonExporter = container.get(TOKENS.JSON_EXPORTER) as any;
          content = JSON.parse(jsonExporter.exportForFile(graphView, { pretty: true }));
          filename = `module-graph-${analysisId}.json`;
          break;
        }

        case 'graphml': {
          const graphmlExporter = container.get(TOKENS.GRAPHML_EXPORTER) as any;
          content = graphmlExporter.export(graphView, { includeLayout: true });
          filename = `module-graph-${analysisId}.graphml`;
          break;
        }

        case 'svg': {
          const svgExporter = container.get(TOKENS.SVG_EXPORTER) as any;
          content = svgExporter.export(graphView, {
            width: 1200,
            height: 800,
            padding: 40,
            showLabels: true
          });
          filename = `module-graph-${analysisId}.svg`;
          break;
        }

        case 'markdown': {
          content = generateMarkdownReport(cached);
          filename = `analysis-${analysisId}-report.md`;
          break;
        }

        default:
          res.status(400).json(
            createErrorResponse(
              'VALIDATION_ERROR',
              'Invalid format. Must be: json, graphml, svg, or markdown'
            )
          );
          return;
      }

      logger.info('Export complete', { analysisId, format });

      res.json(
        createSuccessResponse({
          format,
          content,
          filename
        })
      );
    } catch (error) {
      const logger = container.get(TOKENS.LOGGER) as any;
      logger.error('Export failed', error as Error);
      res.status(500).json(
        createErrorResponse('EXPORT_ERROR', (error as Error).message)
      );
    }
  };
}

/**
 * Validate architecture endpoint
 * POST /api/projections/modules/validate
 */
export function validateArchitecture(container: Container) {
  return async (req: Request, res: Response) => {
    try {
      const { rootPath, config = {} } = req.body;

      if (!rootPath) {
        res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'rootPath is required')
        );
        return;
      }

      // Run analysis first
      const analyzeHandler = analyzeModules(container);
      await new Promise<void>((resolve, reject) => {
        const mockRes = {
          ...res,
          status: (code: number) => mockRes,
          json: (data: any) => {
            if (data.success) {
              resolve();
            } else {
              reject(new Error(data.error?.message || 'Analysis failed'));
            }
            return mockRes;
          }
        } as Response;

        (analyzeHandler as any)(req, mockRes);
      });

      // Get the latest analysis from cache
      const analyses = Array.from(analysisCache.values()).sort(
        (a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
      );
      const latest = analyses[0];

      const layers = config.layers || {
        domain: ['domain'],
        application: ['application'],
        infrastructure: ['infrastructure']
      };

      // Categorize modules by layer
      const domainModules = latest.modules.filter((m: any) =>
        layers.domain.some((pattern: string) => m.path.includes(pattern))
      );
      const appModules = latest.modules.filter((m: any) =>
        layers.application.some((pattern: string) => m.path.includes(pattern))
      );
      const infraModules = latest.modules.filter((m: any) =>
        layers.infrastructure.some((pattern: string) => m.path.includes(pattern))
      );

      // Check domain independence
      const domainViolations: any[] = [];
      for (const domainModule of domainModules) {
        const deps = latest.dependencies.filter((d: any) => d.from === domainModule.id);
        for (const dep of deps) {
          const targetModule = latest.modules.find((m: any) => m.id === dep.to);
          if (
            targetModule &&
            (layers.infrastructure.some((p: string) => targetModule.path.includes(p)) ||
              layers.application.some((p: string) => targetModule.path.includes(p)))
          ) {
            domainViolations.push({
              from: domainModule.name,
              to: targetModule.name
            });
          }
        }
      }

      const validationId = `validation-${Date.now()}`;
      let score = 100;

      // Scoring
      score -= Math.min(latest.summary.circularDependencies * 20, 40);
      score -= Math.min(domainViolations.length * 30, 30);
      score -= Math.min(
        latest.modules.filter((m: any) => m.dependencyCount > 7).length * 5,
        20
      );

      const checks = {
        domainIndependence: {
          name: 'Domain Independence',
          passed: domainViolations.length === 0,
          score: domainViolations.length === 0 ? 100 : Math.max(0, 100 - domainViolations.length * 30),
          message:
            domainViolations.length === 0
              ? 'Domain has 0 dependencies on Infrastructure/Application'
              : `Domain has ${domainViolations.length} violation(s)`,
          violations: domainViolations
        },
        layeredArchitecture: {
          name: 'Layered Architecture',
          passed: domainViolations.length === 0,
          score: domainViolations.length === 0 ? 100 : Math.max(0, 100 - domainViolations.length * 30),
          message: domainViolations.length === 0
            ? 'Layers are properly separated'
            : `${domainViolations.length} layer violation(s) detected`
        },
        noCycles: {
          name: 'No Circular Dependencies',
          passed: latest.summary.circularDependencies === 0,
          score: latest.summary.circularDependencies === 0 ? 100 : Math.max(0, 100 - latest.summary.circularDependencies * 20),
          message:
            latest.summary.circularDependencies === 0
              ? 'No circular dependencies detected'
              : `${latest.summary.circularDependencies} circular dependencies detected`,
          cycles: []
        },
        dependencyDirection: {
          name: 'Dependency Direction',
          passed: domainViolations.length === 0,
          score: domainViolations.length === 0 ? 100 : Math.max(0, 100 - domainViolations.length * 20),
          message:
            domainViolations.length === 0
              ? 'All dependencies flow inward'
              : 'Some dependencies flow outward',
          violations: domainViolations
        }
      };

      const layersData = [
        {
          name: 'domain',
          modules: domainModules.map((m: any) => m.id)
        },
        {
          name: 'application',
          modules: appModules.map((m: any) => m.id)
        },
        {
          name: 'infrastructure',
          modules: infraModules.map((m: any) => m.id)
        }
      ];

      const violations = domainViolations.map((v: any) => ({
        rule: 'domain-independence',
        severity: 'error' as const,
        message: `Domain module "${v.from}" depends on "${v.to}"`,
        module: v.from
      }));

      const grade =
        score >= 90 ? 'A+' : score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 45 ? 'C' : 'F';

      res.json(
        createSuccessResponse({
          validationId,
          score,
          checks,
          layers: layersData,
          violations,
          recommendations: latest.recommendations || [],
          summary: {
            domainModules: domainModules.length,
            applicationModules: appModules.length,
            infrastructureModules: infraModules.length,
            totalViolations: domainViolations.length + latest.summary.circularDependencies
          },
          grade,
          validatedAt: new Date().toISOString()
        })
      );
    } catch (error) {
      const logger = container.get(TOKENS.LOGGER) as any;
      logger.error('Validation failed', error as Error);
      res.status(500).json(
        createErrorResponse('VALIDATION_ERROR', (error as Error).message)
      );
    }
  };
}

/**
 * List analyses endpoint
 * GET /api/projections/modules?limit=50&offset=0&sort=createdAt&order=desc
 */
export function listAnalyses(container: Container) {
  return async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;
      const sort = (req.query.sort as string) || 'createdAt';
      const order = (req.query.order as string) || 'desc';

      const analyses = Array.from(analysisCache.entries())
        .map(([id, data]) => ({
          analysisId: id,
          rootPath: data.rootPath,
          moduleCount: data.summary.totalModules,
          dependencyCount: data.summary.totalDependencies,
          circularCount: data.summary.circularDependencies,
          score: data.summary.architectureScore,
          createdAt: data.analyzedAt
        }))
        .sort((a, b) => {
          const aVal = (a as any)[sort];
          const bVal = (b as any)[sort];
          if (order === 'asc') {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        });

      const total = analyses.length;
      const paginatedAnalyses = analyses.slice(offset, offset + limit);

      res.json(
        createSuccessResponse({
          analyses: paginatedAnalyses,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          }
        })
      );
    } catch (error) {
      const logger = container.get(TOKENS.LOGGER) as any;
      logger.error('List analyses failed', error as Error);
      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', (error as Error).message)
      );
    }
  };
}

/**
 * Delete analysis endpoint
 * DELETE /api/projections/modules/:analysisId
 */
export function deleteAnalysis(container: Container) {
  return async (req: Request, res: Response) => {
    try {
      const { analysisId } = req.params;

      if (!analysisCache.has(analysisId)) {
        res.status(404).json(
          createErrorResponse('NOT_FOUND', 'Analysis not found')
        );
        return;
      }

      analysisCache.delete(analysisId);

      const logger = container.get(TOKENS.LOGGER) as any;
      logger.info('Analysis deleted', { analysisId });

      res.json(
        createSuccessResponse({
          analysisId,
          deleted: true
        })
      );
    } catch (error) {
      const logger = container.get(TOKENS.LOGGER) as any;
      logger.error('Delete analysis failed', error as Error);
      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', (error as Error).message)
      );
    }
  };
}

// Helper functions

function calculateArchitectureScore(projection: any): number {
  let score = 100;
  const metrics = projection.getMetrics();

  // Deduct for circular dependencies (20 points each, max 40)
  score -= Math.min(metrics.cyclicDependencies * 20, 40);

  // Deduct for high coupling (5 points per module with >7 deps, max 20)
  const highlyCoupled = projection
    .getModules()
    .filter((m: any) => m.getDependencyCount() > 7).length;
  score -= Math.min(highlyCoupled * 5, 20);

  return Math.max(0, Math.min(100, score));
}

function generateMarkdownReport(cached: any): string {
  const { summary, modules, dependencies, hotspots, recommendations } = cached;

  let report = `# Module Dependency Analysis\n\n`;
  report += `**Generated:** ${cached.analyzedAt}\n\n`;
  report += `---\n\n`;

  report += `## Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Modules | ${summary.totalModules} |\n`;
  report += `| Total Files | ${summary.totalFiles} |\n`;
  report += `| Total Dependencies | ${summary.totalDependencies} |\n`;
  report += `| Average Coupling | ${summary.averageCoupling.toFixed(2)} |\n`;
  report += `| Max Dependencies | ${summary.maxDependencies} |\n`;
  report += `| Circular Dependencies | ${summary.circularDependencies} |\n`;
  report += `| Architecture Score | ${summary.architectureScore}/100 |\n\n`;

  report += `---\n\n`;

  report += `## Top Modules\n\n`;
  const sortedBySize = [...modules].sort((a, b) => b.fileCount - a.fileCount);
  sortedBySize.slice(0, 5).forEach((m, idx) => {
    report += `${idx + 1}. **${m.name}** - ${m.fileCount} files\n`;
  });
  report += `\n`;

  report += `## Hotspots (Most Used)\n\n`;
  hotspots.forEach((h: any, idx: number) => {
    report += `${idx + 1}. **${h.moduleName}** - Used by ${h.usedByCount} modules\n`;
  });
  report += `\n`;

  report += `## Recommendations\n\n`;
  recommendations.forEach((r: any) => {
    const icon = r.severity === 'success' ? '✓' : '⚠';
    report += `${icon} ${r.message}\n`;
  });
  report += `\n`;

  report += `---\n\n`;
  report += `*Generated by c3-projection Module Analysis API*\n`;

  return report;
}

