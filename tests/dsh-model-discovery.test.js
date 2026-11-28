import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, inject } from '../dsh/index.js';

test('declares DSH tool and LLM dependencies', () => {
  assert.deepEqual(inject, ['tools', 'llm']);
});

test('registers a model discovery tool that reads live DSH providers and models', async () => {
  const registered = [];
  const ctx = {
    tools: { register: definition => registered.push(definition) },
    llm: {
      listProviders: async () => [{ id: 'deepseek', name: 'DeepSeek' }],
      listModels: async provider => {
        assert.equal(provider, 'deepseek');
        return [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }];
      },
    },
  };
  apply(ctx);
  const tool = registered.find(item => item.name === 'gamer_list_ai_models');
  assert.ok(tool, 'model discovery tool is registered');
  const result = await tool.execute({});
  assert.equal(result.status, 'providers_found');
  assert.equal(result.count, 1);
  assert.equal(result.providers[0].models[0].id, 'deepseek-chat');
  assert.doesNotMatch(JSON.stringify(result), /api[_ -]?key|secret/i);
});

test('reports empty provider registry without claiming model readiness', async () => {
  const registered = [];
  const ctx = {
    tools: { register: definition => registered.push(definition) },
    llm: { listProviders: async () => [], listModels: async () => [] },
  };
  apply(ctx);
  const tool = registered.find(item => item.name === 'gamer_list_ai_models');
  const result = await tool.execute({});
  assert.equal(result.status, 'no_provider_registered');
  assert.equal(result.count, 0);
});

test('does not register tools if DSH LLM service is absent', () => {
  const registered = [];
  apply({ tools: { register: item => registered.push(item) } });
  assert.equal(registered.length, 0);
});
