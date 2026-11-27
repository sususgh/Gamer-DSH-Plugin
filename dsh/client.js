// Browser-side DSH plugin card. Uses the same lazy module-loader contract
// as other native DSH bundles and makes no network calls or game actions.
window.__ModuleLoader__.load({
  id: '@sususgh/gamer-dsh-plugin',
  factory: (require) => {
    var module = { exports: {} };
    var React = require('react');
    var h = React.createElement;

    function Card() {
      var items = [
        ['DSH 原生插件', '已集成'],
        ['桌面端 UI', '原型可用'],
        ['Android 配对', '尚未接入'],
        ['视觉识别运行时', '尚未接入'],
        ['自动游戏控制', '尚未接入']
      ];
      return h('section', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px',
          border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.25))',
          borderRadius: '12px',
          color: 'var(--dsw-alias-label-primary, inherit)'
        }
      },
        h('div', null,
          h('strong', { style: { fontSize: '15px' } }, 'Gamer 游戏智能体'),
          h('p', { style: { margin: '6px 0 0', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary, #888)' } },
            'Gamer-DSH-Plugin v1.0.0 · DSH 原生插件')
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '8px' } },
          ...items.map(([label, value]) => h('div', {
            key: label,
            style: {
              padding: '10px',
              borderRadius: '8px',
              background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.07))'
            }
          },
            h('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary, #888)' } }, label),
            h('strong', { style: { display: 'block', marginTop: '4px', fontSize: '13px' } }, value)
          ))
        ),
        h('p', {
          style: {
            margin: 0,
            fontSize: '12px',
            lineHeight: 1.6,
            color: 'var(--dsw-alias-label-tertiary, #888)'
          }
        }, '当前版本提供 DSH 插件入口与状态查询。请注意：Android 双端通信、视觉识别和自动游戏控制尚未完成，当前不会执行真实游戏操作。'),
        h('a', {
          href: 'https://github.com/sususgh/Gamer-DSH-Plugin',
          target: '_blank',
          rel: 'noreferrer',
          style: { fontSize: '13px', color: 'var(--dsw-alias-label-link, #4b91d1)' }
        }, '查看 GitHub 项目与开发进度 ↗')
      );
    }

    function apply(ctx) {
      if (!ctx || typeof ctx.inject !== 'function') return;
      ctx.inject(['slots'], (scope) => {
        if (!scope?.slots?.inject || !scope?.slots?.register) return;
        scope.slots.inject('plugins.bundle.config', function* () {
          yield scope.slots.register(
            { name: 'plugins.bundle.config', key: '@sususgh/gamer-dsh-plugin' },
            Card
          );
        });
        scope.slots.inject('settings.plugin.item', function* () {
          yield scope.slots.register(
            { name: 'settings.plugin.item', id: 'gamer-dsh-plugin', key: 'gamer-dsh-plugin', order: 40 },
            Card
          );
        });
      });
    }

    module.exports = { apply, inject: [] };
    return module.exports;
  }
});
