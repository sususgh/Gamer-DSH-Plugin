import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../dsh/index.js';

test('registers model discovery and status tools with live DSH services', async () => {
  const registered = [];
  const ctx = {
    tools: { register: tool => registered.push(tool) },
    llm: { listProviders: async () => [], listModels: async () => [] },
  };
  apply(ctx);
  assert.deepEqual(registered.map(tool => tool.name).sort(), [
    'gamer_list_ai_models',
    'gamer_project_status',
  ]);
  const statusTool = registered.find(tool => tool.name === 'gamer_project_status');
  const status = await statusTool.execute({});
  assert.equal(status.project, 'Gamer-DSH-Plugin');
  assert.equal(status.canControlGames, false);
  assert.match(status.gameControlRuntime, /not connected/);
  assert.match(status.modelDiscovery, /No registered model provider/);
});
