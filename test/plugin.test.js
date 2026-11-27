import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../dsh/index.js';

test('registers a DSH status tool and reports implementation honestly', async () => {
  const registered = [];
  apply({ tools: { register: (tool) => registered.push(tool) } });
  assert.equal(registered.length, 1);
  assert.equal(registered[0].name, 'gamer_project_status');
  const status = await registered[0].execute({});
  assert.equal(status.pluginLoaded, true);
  assert.equal(status.canControlGames, false);
  assert.equal(status.gameControlRuntime, 'not implemented');
});
