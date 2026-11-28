/**
 * Gamer DSH Plugin — model-aware native Harness integration.
 *
 * The plugin reads the registered DSH model routes through ctx.llm and exposes
 * that inventory as a model-callable tool. It does not claim gameplay control
 * until an authenticated desktop/Android runtime is connected.
 */
export const name = 'gamer-dsh-plugin';
export const inject = ['tools', 'llm'];

const EMPTY_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};

const JSON_OUTPUT = {
  schema: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      providers: { type: 'array', items: { type: 'object' } },
      count: { type: 'integer' },
      message: { type: 'string' },
    },
    required: ['status', 'providers', 'count', 'message'],
    additionalProperties: false,
  },
  render: (_args, value) => [{
    type: 'text',
    text: JSON.stringify(value, null, 2),
  }],
  presentationMeta: () => ({}),
};

function register(ctx, definition) {
  if (typeof ctx?.tools?.register !== 'function') {
    throw new Error('DSH_TOOLS_SERVICE_UNAVAILABLE');
  }
  ctx.tools.register(definition);
}

export function apply(ctx) {
  if (!ctx?.llm || typeof ctx.llm.listProviders !== 'function'
      || typeof ctx.llm.listModels !== 'function') {
    console.error('[gamer-dsh-plugin] DSH llm service unavailable; model discovery tool was not registered.');
    return;
  }

  register(ctx, {
    name: 'gamer_list_ai_models',
    description:
      'List AI model providers and models currently registered in this DeepSeek Harness instance. Use this before selecting a model for Gamer gameplay. This reads the Harness model registry; it does not expose API keys or secrets.',
    parameters: EMPTY_SCHEMA,
    output: JSON_OUTPUT,
    async execute() {
      const providers = await ctx.llm.listProviders();
      const inventory = await Promise.all(providers.map(async provider => {
        try {
          const models = await ctx.llm.listModels(provider.id);
          return {
            provider: provider.id,
            providerName: provider.name,
            models: models.map(model => ({
              id: model.id,
              name: model.name ?? model.id,
              ...(model.contextWindow ? { contextWindow: model.contextWindow } : {}),
            })),
            available: true,
          };
        } catch (error) {
          return {
            provider: provider.id,
            providerName: provider.name,
            models: [],
            available: false,
            error: error?.message || 'MODEL_DISCOVERY_FAILED',
          };
        }
      }));
      const count = inventory.reduce((sum, item) => sum + item.models.length, 0);
      return {
        status: inventory.length ? 'providers_found' : 'no_provider_registered',
        providers: inventory,
        count,
        message: inventory.length
          ? 'Model registry read from DSH. The model calling this tool remains the active conversation model; API credentials were not returned.'
          : 'No active LLM provider adapter is registered in DSH. Configure and enable a provider before starting Gamer.',
      };
    },
  });

  register(ctx, {
    name: 'gamer_project_status',
    description:
      'Return verified Gamer runtime status. Distinguish model discovery from an authenticated Android connection and real gameplay control.',
    parameters: EMPTY_SCHEMA,
    output: {
      schema: {
        type: 'object',
        properties: {
          project: { type: 'string' },
          version: { type: 'string' },
          modelDiscovery: { type: 'string' },
          androidCompanion: { type: 'string' },
          visionRuntime: { type: 'string' },
          gameControlRuntime: { type: 'string' },
          canControlGames: { type: 'boolean' },
          nextStep: { type: 'string' },
          repository: { type: 'string' },
        },
        required: [
          'project', 'version', 'modelDiscovery', 'androidCompanion',
          'visionRuntime', 'gameControlRuntime', 'canControlGames',
          'nextStep', 'repository',
        ],
        additionalProperties: false,
      },
      render: (_args, value) => [{
        type: 'text',
        text: JSON.stringify(value, null, 2),
      }],
      presentationMeta: () => ({}),
    },
    async execute() {
      const providers = await ctx.llm.listProviders();
      return {
        project: 'Gamer-DSH-Plugin',
        version: '1.0.2-dev',
        modelDiscovery: providers.length
          ? providers.map(item => item.name || item.id).join(', ')
          : 'No registered model provider',
        androidCompanion: 'not authenticated; Android handshake not implemented',
        visionRuntime: 'not implemented',
        gameControlRuntime: 'not connected; no game actions can be executed',
        canControlGames: false,
        nextStep: 'Complete authenticated desktop-to-Android session transport, screen capture, vision inference and input adapters; run device acceptance tests.',
        repository: 'https://github.com/sususgh/Gamer-DSH-Plugin',
      };
    },
  });
}
