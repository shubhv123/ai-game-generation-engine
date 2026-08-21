/**
 * Injected 2-Player SDK (window.MP)
 * Dynamically toggles between VS Computer Bot AI and Local 2-Player dual controls.
 */

export function getMultiplayerInjectSnippet(mode = 'bot') {
  return `
    // 2-Player Local & Bot Controller (window.MP)
    (function() {
      var _mode = "${mode}";
      window.MP = window.MP || {};
      window.MP.modeChangeAckCount = 0;

      try {
        Object.defineProperty(window.MP, 'mode', {
          get: function() { return _mode; },
          set: function(val) { _mode = val; },
          configurable: true
        });
        Object.defineProperty(window.MP, 'isBot', {
          get: function() { return _mode === 'bot'; },
          set: function(val) { _mode = val ? 'bot' : 'local'; },
          configurable: true
        });
      } catch(e) {
        window.MP.mode = _mode;
        window.MP.isBot = (_mode === 'bot');
      }

      window.MP.setMode = function(m) {
        _mode = m;
        window.MP.modeChangeAckCount++;
        window.MP.mode = m;
        window.MP.isBot = (m === 'bot');
        if (typeof window.onMPModeChange === 'function') {
          try { window.onMPModeChange(m, m === 'bot'); } catch(err) {}
        }
      };

      // Listen for real-time mode toggles from UI buttons
      window.addEventListener('message', function(evt) {
        if (evt.data && evt.data.type === 'MP_SET_MODE') {
          if (window.MP && typeof window.MP.setMode === 'function') {
            window.MP.setMode(evt.data.mode);
          }
        }
      });
    })();
  `;
}
