// Browser-side DSH plugin UI. The module is loaded by dsh-client-modules.
window.__ModuleLoader__.load({
  id: '@sususgh/gamer-dsh-plugin',
  factory: (require) => {
    const React = require('react');
    const h = React.createElement;

    const COPY = {
      zh: {
        title: 'Gamer 游戏智能体', subtitle: 'PC 游戏控制中心 · Android 手机伴侣', version: '版本 1.0.1',
        overview: '运行状态', ready: 'DSH 插件入口已加载',
        desktop: '桌面端控制台', desktopValue: '界面框架已提供，游戏运行时尚未接入',
        android: 'Android 手机伴侣', androidValue: '通信服务尚未接入',
        vision: '视觉识别', visionValue: '尚未接入',
        automation: '自动游戏控制', automationValue: '尚未接入，不会执行游戏操作',
        pairing: '设备二维码配对', pairingHint: '连接 Android 手机后，可通过二维码建立安全配对。',
        qrUnavailable: '二维码配对服务尚未接入',
        qrDetail: '当前版本还没有桌面端配对服务器，暂时无法生成真实、可扫描的连接二维码。',
        qrNote: '不会显示伪造二维码，也不会误报设备已连接。',
        roadmap: '接下来', roadmapText: '先完成桌面端配对服务与 Android Companion，再启用二维码生成、双端认证和设备状态同步。',
        repo: '查看 GitHub 项目与开发进度', language: '界面语言', chinese: '简体中文', english: 'English',
        summary: '查看 Gamer 状态、语言选项与 Android 配对进度。',
        status: '未连接', noGameControl: '当前版本不会控制游戏或发送键鼠/触控指令。'
      },
      en: {
        title: 'Gamer AI Agent', subtitle: 'PC game control center · Android companion', version: 'Version 1.0.1',
        overview: 'Runtime status', ready: 'Native DSH plugin entry loaded',
        desktop: 'Desktop control center', desktopValue: 'UI shell is present; game runtime is not connected',
        android: 'Android companion', androidValue: 'Communication service is not connected',
        vision: 'Visual perception', visionValue: 'Not implemented',
        automation: 'Automatic gameplay', automationValue: 'Not implemented; no game actions are executed',
        pairing: 'QR device pairing', pairingHint: 'Pair an Android phone securely after the companion service is available.',
        qrUnavailable: 'QR pairing service is not connected',
        qrDetail: 'This release has no desktop pairing server yet, so it cannot generate a real, scannable connection QR code.',
        qrNote: 'No fake QR code is shown and no device is reported as connected.',
        roadmap: 'Next steps', roadmapText: 'Implement the desktop pairing service and Android companion before enabling QR generation, two-sided authentication and device status sync.',
        repo: 'View GitHub project and development progress', language: 'Language', chinese: '简体中文', english: 'English',
        summary: 'View Gamer status, language options and Android pairing progress.',
        status: 'Disconnected', noGameControl: 'This release does not control games or send keyboard, mouse or touch input.'
      }
    };

    function StatusTile({ label, value }) {
      return h('div', {
        style: { minWidth: 0, padding: '13px', borderRadius: '12px',
          background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.07))',
          border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))' }
      },
        h('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-tertiary, #888)', marginBottom: '6px' } }, label),
        h('div', { style: { fontSize: '13px', lineHeight: 1.55, fontWeight: 600 } }, value)
      );
    }

    function GamerConfig() {
      const [language, setLanguage] = React.useState('zh');
      const c = COPY[language];
      return h('section', { style: { display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', color: 'var(--dsw-alias-label-primary, inherit)' } },
        h('header', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' } },
          h('div', null,
            h('div', { style: { fontSize: '19px', fontWeight: 700, letterSpacing: '-.02em' } }, c.title),
            h('div', { style: { marginTop: '5px', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary, #888)' } }, c.subtitle),
            h('div', { style: { marginTop: '5px', fontSize: '11px', color: 'var(--dsw-alias-label-tertiary, #888)' } }, c.version)
          ),
          h('div', { role: 'group', 'aria-label': c.language, style: { display: 'flex', gap: '4px', padding: '3px', borderRadius: '10px', background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.08))' } },
            ...[['zh', c.chinese], ['en', c.english]].map(([key, label]) => h('button', {
              key, type: 'button', onClick: () => setLanguage(key), 'aria-pressed': language === key,
              style: { border: 0, borderRadius: '7px', padding: '7px 10px', cursor: 'pointer', fontSize: '12px',
                color: language === key ? 'var(--dsw-alias-label-primary, inherit)' : 'var(--dsw-alias-label-tertiary, #888)',
                background: language === key ? 'var(--dsw-alias-bg-layer-1, rgba(127,127,127,.14))' : 'transparent' }
            }, label))
          )
        ),
        h('section', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          h('div', { style: { fontSize: '14px', fontWeight: 650 } }, c.overview),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--dsw-alias-label-secondary, #777)' } },
            h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: '#2eaa72', display: 'inline-block' } }), c.ready),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '9px' } },
            h(StatusTile, { label: c.desktop, value: c.desktopValue }),
            h(StatusTile, { label: c.android, value: c.androidValue }),
            h(StatusTile, { label: c.vision, value: c.visionValue }),
            h(StatusTile, { label: c.automation, value: c.automationValue })
          )
        ),
        h('section', { style: { padding: '16px', borderRadius: '14px', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.22))', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(180px,220px)', gap: '18px', alignItems: 'center' } },
          h('div', { style: { minWidth: 0 } },
            h('div', { style: { fontSize: '15px', fontWeight: 700 } }, c.pairing),
            h('p', { style: { margin: '7px 0 10px', fontSize: '12px', lineHeight: 1.65, color: 'var(--dsw-alias-label-secondary, #777)' } }, c.pairingHint),
            h('div', { style: { fontSize: '13px', fontWeight: 650 } }, c.qrUnavailable),
            h('p', { style: { margin: '6px 0 0', fontSize: '12px', lineHeight: 1.65, color: 'var(--dsw-alias-label-tertiary, #888)' } }, c.qrDetail),
            h('p', { style: { margin: '7px 0 0', fontSize: '11px', lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary, #888)' } }, c.qrNote)
          ),
          h('div', { style: { minHeight: '176px', borderRadius: '12px', border: '1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,.35))', background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.05))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', textAlign: 'center', padding: '14px' } },
            h('svg', { width: 52, height: 52, viewBox: '0 0 52 52', fill: 'none', 'aria-hidden': true },
              h('rect', { x: 8, y: 3, width: 26, height: 44, rx: 5, stroke: 'currentColor', strokeWidth: 2 }),
              h('path', { d: 'M17 10h8M19 40h4', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }),
              h('path', { d: 'M38 17l7 7-7 7M45 24H30', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
            ),
            h('div', { style: { fontSize: '12px', fontWeight: 650 } }, c.status),
            h('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary, #888)' } }, 'QR · Pending')
          )
        ),
        h('section', { style: { padding: '14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.06))' } },
          h('div', { style: { fontSize: '13px', fontWeight: 700, marginBottom: '5px' } }, c.roadmap),
          h('div', { style: { fontSize: '12px', lineHeight: 1.65, color: 'var(--dsw-alias-label-secondary, #777)' } }, c.roadmapText),
          h('div', { style: { marginTop: '8px', fontSize: '11px', lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary, #888)' } }, c.noGameControl)
        ),
        h('a', { href: 'https://github.com/sususgh/Gamer-DSH-Plugin', target: '_blank', rel: 'noreferrer',
          style: { fontSize: '12px', color: 'var(--dsw-alias-label-link, #4b91d1)', textDecoration: 'none' } }, c.repo + ' ↗')
      );
    }

    function apply(ctx) {
      ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
        name: 'plugins.bundle.config',
        key: '@sususgh/gamer-dsh-plugin'
      }, ({ view }) => view === 'summary'
        ? h('span', null, 'Gamer · PC + Android game-agent integration')
        : h(GamerConfig)
      ));
    }

    return { inject: ['slots'], apply };
  }
});
