// Browser-side DSH plugin card. Generates a short-lived, single-use PIN locally.
// The PIN is a pairing code, not a transport credential; the authenticated
// rendezvous/handshake service is a separate runtime component.
window.__ModuleLoader__.load({
  id: '@sususgh/gamer-dsh-plugin',
  factory: (require) => {
    var module = { exports: {} };
    var React = require('react');
    var h = React.createElement;

    function createPin() {
      if (!window.crypto || !window.crypto.getRandomValues) {
        throw new Error('当前环境不支持安全随机数，无法生成 PIN');
      }
      var limit = Math.floor(4294967296 / 1000000) * 1000000;
      var value;
      var bytes = new Uint32Array(1);
      do {
        window.crypto.getRandomValues(bytes);
        value = bytes[0];
      } while (value >= limit);
      return String(value % 1000000).padStart(6, '0');
    }

    function Card() {
      var state = React.useState(function () {
        try { return { pin: createPin(), expiresAt: Date.now() + 120000, error: '' }; }
        catch (error) { return { pin: '', expiresAt: 0, error: error.message }; }
      });
      var pairing = state[0];
      var setPairing = state[1];
      var tick = React.useState(Date.now());
      var setTick = tick[1];

      React.useEffect(function () {
        var timer = window.setInterval(function () { setTick(Date.now()); }, 1000);
        return function () { window.clearInterval(timer); };
      }, []);

      var remaining = Math.max(0, Math.ceil((pairing.expiresAt - tick[0]) / 1000));
      var expired = !pairing.pin || remaining <= 0;
      function regenerate() {
        try { setPairing({ pin: createPin(), expiresAt: Date.now() + 120000, error: '' }); }
        catch (error) { setPairing({ pin: '', expiresAt: 0, error: error.message }); }
      }
      function copyPin() {
        if (!pairing.pin || expired) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(pairing.pin).catch(function () {});
        }
      }

      var items = [
        ['DSH 原生插件', '已集成'],
        ['PIN 配对码', expired ? '已过期' : '已生成'],
        ['二维码配对', '保留原入口'],
        ['桌面端认证', '等待运行时接入'],
        ['视觉与游戏控制', '尚未接入']
      ];
      return h('section', {
        style: {
          display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px',
          border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.25))',
          borderRadius: '12px', color: 'var(--dsw-alias-label-primary, inherit)'
        }
      },
        h('div', null,
          h('strong', { style: { fontSize: '15px' } }, 'Gamer 游戏智能体'),
          h('p', { style: { margin: '6px 0 0', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary, #888)' } },
            'Gamer-DSH-Plugin · PIN / QR 双配对入口')
        ),
        h('div', { style: { padding: '14px', borderRadius: '10px', background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.07))' } },
          h('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-tertiary, #888)' } }, 'Windows 桌面端请输入此 PIN'),
          h('div', { style: { fontSize: '30px', fontWeight: '700', letterSpacing: '8px', margin: '8px 0', fontVariantNumeric: 'tabular-nums' } }, expired ? '------' : pairing.pin),
          h('div', { style: { fontSize: '12px', color: expired ? '#c87945' : 'var(--dsw-alias-label-tertiary, #888)' } },
            pairing.error || (expired ? 'PIN 已过期，请重新生成' : '有效期 ' + Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0') + ' · 一次性使用')),
          h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } },
            h('button', { type: 'button', onClick: copyPin, disabled: expired, style: { padding: '8px 12px', borderRadius: '8px', cursor: expired ? 'not-allowed' : 'pointer' } }, '复制 PIN'),
            h('button', { type: 'button', onClick: regenerate, style: { padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' } }, expired ? '重新生成 PIN' : '更换 PIN')
          )
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '8px' } },
          ...items.map(([label, value]) => h('div', {
            key: label, style: { padding: '10px', borderRadius: '8px', background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.07))' }
          }, h('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary, #888)' } }, label),
          h('strong', { style: { display: 'block', marginTop: '4px', fontSize: '13px' } }, value)))
        ),
        h('p', { style: { margin: 0, fontSize: '12px', lineHeight: 1.6, color: 'var(--dsw-alias-label-tertiary, #888)' } },
          'PIN 由安全随机数生成，有效 2 分钟。当前版本已实现 PIN 展示与复制；跨进程 PIN 校验、一次性消费和加密握手仍需配对服务，不能仅凭输入 PIN 宣称设备已连接。二维码入口继续保留。'),
        h('a', { href: 'https://github.com/sususgh/Gamer-DSH-Plugin', target: '_blank', rel: 'noreferrer',
          style: { fontSize: '13px', color: 'var(--dsw-alias-label-link, #4b91d1)' } }, '查看 GitHub 项目与开发进度 ↗')
      );
    }

    function apply(ctx) {
      if (!ctx || typeof ctx.inject !== 'function') return;
      ctx.inject(['slots'], (scope) => {
        if (!scope?.slots?.inject || !scope?.slots?.register) return;
        scope.slots.inject('plugins.bundle.config', function* () {
          yield scope.slots.register({ name: 'plugins.bundle.config', key: '@sususgh/gamer-dsh-plugin' }, Card);
        });
        scope.slots.inject('settings.plugin.item', function* () {
          yield scope.slots.register({ name: 'settings.plugin.item', id: 'gamer-dsh-plugin', key: 'gamer-dsh-plugin', order: 40 }, Card);
        });
      });
    }
    module.exports = { apply, inject: [] };
    return module.exports;
  }
});
