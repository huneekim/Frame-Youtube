//sidebar tab navigation
function switchTab(tab) {
  document
    .querySelectorAll(".tabBtn")
    .forEach(function (btn) {
      btn.classList.toggle(
        "active",
        btn.dataset.tab === tab,
      );
    });
  document
    .querySelectorAll(".tab-panel")
    .forEach(function (panel) {
      panel.classList.toggle(
        "active",
        panel.id === "panel-" + tab,
      );
    });
}

function bindInputs() {
  document
    .querySelectorAll("[data-bind]")
    .forEach(function (input) {
      var targetId = input.dataset.bind;
      var target = document.getElementById(targetId);
      if (!target) return;

      input.addEventListener("input", function () {
        if (input.dataset.multiline === "true") {
          target.innerHTML = input.value
            .split("\n")
            .map(function (line) {
              return line;
            })
            .join("<br />");
        } else {
          target.textContent = input.value;
        }
      });
    });
}

// video explanation last line <br>
function bindSnippet() {
  var input = document.getElementById("snippet-input");
  var linesTarget = document.getElementById(
    "out-snippet-lines",
  );
  var lastLineTarget = document.getElementById(
    "out-snippet-last-line",
  );
  if (!input || !linesTarget || !lastLineTarget) return;

  function render() {
    var lines = input.value.split("\n").slice(0, 3);
    while (lines.length < 3) lines.push("");

    linesTarget.innerHTML = lines[0] + "<br>" + lines[1];
    lastLineTarget.textContent = lines[2];
  }

  input.addEventListener("input", render);
  render();
}

// add photo
function bindImageInputs() {
  document
    .querySelectorAll("[data-img-bind]")
    .forEach(function (input) {
      input.addEventListener("change", function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;

        var targetIds = input.dataset.imgBind.split(" ");

        var reader = new FileReader();
        reader.onload = function (ev) {
          var probe = new Image();
          probe.onload = function () {
            targetIds.forEach(function (targetId) {
              var layer = document.getElementById(targetId);
              if (!layer) return;
              var wrap = layer.parentElement;
              layer.style.backgroundImage =
                "url(" + ev.target.result + ")";
              wrap.classList.add("has-image");
              wrap.__naturalW = probe.naturalWidth;
              wrap.__naturalH = probe.naturalHeight;
              // new photo reset
              if (
                typeof wrap.__resetImgTransform ===
                "function"
              ) {
                wrap.__resetImgTransform();
              }
            });
          };
          probe.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    });
}

// drag · scroll
var MAX_IMG_SCALE = 10;
var MIN_IMG_SCALE = 1;

function bindImageEditing() {
  document
    .querySelectorAll(".img-editable")
    .forEach(function (wrap) {
      var layer = wrap.querySelector(".img-fill");
      if (!layer || wrap.__imgEditBound) return;
      wrap.__imgEditBound = true;

      var state = { scale: 1, offsetX: 0, offsetY: 0 };

      function geometry() {
        var iw = wrap.__naturalW,
          ih = wrap.__naturalH;
        if (!iw || !ih) return null;
        var rect = wrap.getBoundingClientRect();
        var cw = rect.width,
          ch = rect.height;
        var coverScale = Math.max(cw / iw, ch / ih);
        return {
          cw: cw,
          ch: ch,
          iw: iw,
          ih: ih,
          coverScale: coverScale,
        };
      }

      function apply() {
        var geo = geometry();
        if (!geo) return;
        var renderW = geo.iw * geo.coverScale * state.scale;
        var renderH = geo.ih * geo.coverScale * state.scale;
        layer.style.backgroundRepeat = "no-repeat";
        layer.style.backgroundSize =
          renderW + "px " + renderH + "px";
        layer.style.backgroundPosition =
          state.offsetX + "px " + state.offsetY + "px";
      }

      function clamp() {
        var geo = geometry();
        if (!geo) return;
        var renderW = geo.iw * geo.coverScale * state.scale;
        var renderH = geo.ih * geo.coverScale * state.scale;
        var minX = geo.cw - renderW;
        var minY = geo.ch - renderH;
        if (state.offsetX > 0) state.offsetX = 0;
        if (state.offsetX < minX) state.offsetX = minX;
        if (state.offsetY > 0) state.offsetY = 0;
        if (state.offsetY < minY) state.offsetY = minY;
      }

      wrap.__resetImgTransform = function () {
        state.scale = 1;
        var geo = geometry();
        if (geo) {
          var renderW = geo.iw * geo.coverScale;
          var renderH = geo.ih * geo.coverScale;
          state.offsetX = (geo.cw - renderW) / 2;
          state.offsetY = (geo.ch - renderH) / 2;
        } else {
          state.offsetX = 0;
          state.offsetY = 0;
        }
        apply();
      };

      var dragging = false;
      var startPointerX = 0,
        startPointerY = 0;
      var startOffsetX = 0,
        startOffsetY = 0;

      wrap.addEventListener("mousedown", function (e) {
        if (!wrap.classList.contains("has-image")) return;
        dragging = true;
        wrap.classList.add("dragging");
        startPointerX = e.clientX;
        startPointerY = e.clientY;
        startOffsetX = state.offsetX;
        startOffsetY = state.offsetY;
        e.preventDefault();
      });

      window.addEventListener("mousemove", function (e) {
        if (!dragging) return;
        state.offsetX =
          startOffsetX + (e.clientX - startPointerX);
        state.offsetY =
          startOffsetY + (e.clientY - startPointerY);
        clamp();
        apply();
      });

      window.addEventListener("mouseup", function () {
        if (!dragging) return;
        dragging = false;
        wrap.classList.remove("dragging");
      });

      wrap.addEventListener(
        "wheel",
        function (e) {
          if (!wrap.classList.contains("has-image")) return;
          var geo = geometry();
          if (!geo) return;
          e.preventDefault();

          var factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
          var oldScale = state.scale;
          var newScale = Math.min(
            MAX_IMG_SCALE,
            Math.max(MIN_IMG_SCALE, oldScale * factor),
          );
          if (newScale === oldScale) return;

          var ratio = newScale / oldScale;
          state.offsetX =
            geo.cw / 2 -
            (geo.cw / 2 - state.offsetX) * ratio;
          state.offsetY =
            geo.ch / 2 -
            (geo.ch / 2 - state.offsetY) * ratio;
          state.scale = newScale;

          clamp();
          apply();
        },
        { passive: false },
      );
    });
}

// .main(1280x1080) ratio
function fitMain() {
  if (document.body.classList.contains("stack-mode")) return;

  var viewport = document.querySelector(".main-viewport");
  var main = document.querySelector(".main");
  if (!viewport || !main) return;

  var availW = viewport.clientWidth - 32;

  var scale = Math.min(availW / 1280, 1);
  main.style.setProperty("--main-scale", scale);
}

// subscribe like spacing 32px
function updateActionRowOverflow() {
  var channelBlock = document.querySelector(".channel-block");
  var actionRow = document.querySelector(".action-row");
  if (!channelBlock || !actionRow) return;

  var pills = Array.prototype.slice.call(
    actionRow.querySelectorAll(".pill"),
  );
  if (pills.length === 0) return;

  // keep the 'show more' button.
  var hideable = pills.slice(0, pills.length - 1);
  hideable.forEach(function (pill) {
    pill.style.display = ""; // remeasurement after initialization
  });

  function measureGap() {
    return (
      actionRow.offsetLeft -
      (channelBlock.offsetLeft + channelBlock.offsetWidth)
    );
  }

  for (var i = hideable.length - 1; i >= 0; i--) {
    if (measureGap() > 32) break;
    hideable[i].style.display = "none";
  }
}

function runLayoutChecks() {
  fitMain();
  updateActionRowOverflow();
  updateMainWidthClass();
}

function updateMainWidthClass() {
  var main = document.querySelector(".main");
  if (!main) return;

  var w = main.getBoundingClientRect().width;

  document.body.classList.toggle("main-w-656", w <= 656);
  document.body.classList.toggle("main-w-918", w <= 918);
  document.body.classList.toggle("main-w-622", w <= 622);
}

// on(vertical stack) · off(fixed ratio) switch
function toggleStackMode(isOn) {
  document.body.classList.toggle("stack-mode", isOn);
  runLayoutChecks();
}

document.addEventListener("DOMContentLoaded", function () {
  bindInputs();
  bindSnippet();
  bindImageInputs();
  bindImageEditing();
  runLayoutChecks();
  captureInitialValues();
  loadStateFromCookie();
});

document.addEventListener("input", updateActionRowOverflow);

window.addEventListener("resize", runLayoutChecks);

// html-to-image library load wait
var HTML_TO_IMAGE_FALLBACK_SRCS = [
  "https://unpkg.com/html-to-image@1.11.11/dist/html-to-image.min.js",
  "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js",
];

function loadScriptOnce(src) {
  return new Promise(function (resolve, reject) {
    var existing = document.querySelector(
      'script[data-fallback-src="' + src + '"]',
    );
    if (existing) {
      resolve();
      return;
    }
    var s = document.createElement("script");
    s.src = src;
    s.dataset.fallbackSrc = src;
    s.onload = function () {
      resolve();
    };
    s.onerror = function () {
      reject(new Error("load-failed"));
    };
    document.head.appendChild(s);
  });
}

async function waitForHtmlToImage(timeoutMs = 8000) {
  var start = Date.now();
  var fallbackTriedAt = null;
  var fallbackIndex = 0;

  while (!window.htmlToImage) {
    var elapsed = Date.now() - start;

    // after 2sec try cdn
    if (
      elapsed > 2000 &&
      fallbackIndex < HTML_TO_IMAGE_FALLBACK_SRCS.length &&
      (fallbackTriedAt === null ||
        Date.now() - fallbackTriedAt > 1500)
    ) {
      fallbackTriedAt = Date.now();
      var src = HTML_TO_IMAGE_FALLBACK_SRCS[fallbackIndex];
      fallbackIndex += 1;
      loadScriptOnce(src).catch(function () {
      });
    }

    if (elapsed > timeoutMs) {
      throw new Error(
        "html-to-image 라이브러리를 불러오지 못했습니다. 네트워크 연결을 확인해주세요.",
      );
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

function buildCaptureFilename() {
  return "youtube_pair_frame.png";
}

// capture
async function captureImage() {
  var captureTarget = document.querySelector(".main");
  if (!captureTarget) {
    console.error("캡처 대상(.main)을 찾을 수 없습니다.");
    alert("스크린샷 저장 중 오류가 발생했습니다.");
    return;
  }

  var btn = document.getElementById("captureBtn");
  if (btn) btn.classList.add("is-busy");

  var isStackMode = document.body.classList.contains("stack-mode");

  var prevTransform = captureTarget.style.transform;
  if (!isStackMode) {
    captureTarget.style.transform = "none";
  }

  try {
    await waitForHtmlToImage();
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    var rect = captureTarget.getBoundingClientRect();
    var captureWidth = rect.width;
    var captureHeight = isStackMode
      ? captureTarget.scrollHeight
      : rect.height;

    var canvas = await window.htmlToImage.toCanvas(captureTarget, {
      width: captureWidth,
      height: captureHeight,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      filter: function (node) {
        if (node.tagName === "SCRIPT") return false;
        return true;
      },
    });

    var dataUrl = canvas.toDataURL("image/png");
    var a = document.createElement("a");
    a.href = dataUrl;
    a.download = buildCaptureFilename();
    a.click();
  } catch (err) {
    var message =
      err && err.message ? err.message : String(err);
    console.error("캡처에 실패하였습니다.", err);
    alert("이미지 저장에 실패했습니다: " + message);
  } finally {
    captureTarget.style.transform = prevTransform;
    if (btn) btn.classList.remove("is-busy");
  }
}

// ===== 사이드바 입력값 쿠키 저장 / 초기화 =====

var STATE_COOKIE_NAME = "hunee_pair_frame_state";
var STATE_COOKIE_DAYS = 365;

// 저장 대상: 사진(input[type=file])을 제외한 사이드바 입력 요소 전부
function getPersistableInputs() {
  return Array.prototype.slice.call(
    document.querySelectorAll(
      ".sidebar input:not([type='file']), .sidebar textarea",
    ),
  );
}

function setCookie(name, value, days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie =
    name + "=" + encodeURIComponent(value) + expires + "; path=/; SameSite=Lax";
}

function getCookie(name) {
  var match = document.cookie.match(
    new RegExp("(?:^|; )" + name + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name) {
  document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

// 각 입력 요소를 구분할 고유 키 (없으면 저장/복원 대상에서 제외)
function inputStateKey(input) {
  return input.id || input.dataset.bind || null;
}

// 페이지 최초 로드 시점의 입력값을 메모리에 보관 (초기화용)
var initialInputValues = {};

function captureInitialValues() {
  getPersistableInputs().forEach(function (input) {
    var key = inputStateKey(input);
    if (!key) return;
    initialInputValues[key] = input.value;
  });
}

// [현재 상태 저장] 버튼
function manualSave() {
  var state = {};
  getPersistableInputs().forEach(function (input) {
    var key = inputStateKey(input);
    if (!key) return;
    state[key] = input.value;
  });

  try {
    setCookie(STATE_COOKIE_NAME, JSON.stringify(state), STATE_COOKIE_DAYS);
    showSaveFeedback(true);
  } catch (err) {
    console.error("상태 저장에 실패했습니다.", err);
    showSaveFeedback(false);
  }
}

function showSaveFeedback(success) {
  var btn = document.getElementById("saveBtn");
  if (!btn) return;
  var original = btn.textContent;
  btn.textContent = success ? "저장됨!" : "저장 실패";
  btn.disabled = true;
  setTimeout(function () {
    btn.textContent = original;
    btn.disabled = false;
  }, 1200);
}

// 쿠키에 저장된 값을 입력에 적용하고 관련 렌더링(input 이벤트)을 트리거
function applyStateToInputs(state) {
  getPersistableInputs().forEach(function (input) {
    var key = inputStateKey(input);
    if (!key || !(key in state)) return;
    input.value = state[key];
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

// 페이지 로드시 쿠키에 저장된 상태가 있으면 복원
function loadStateFromCookie() {
  var raw = getCookie(STATE_COOKIE_NAME);
  if (!raw) return;

  try {
    var state = JSON.parse(raw);
    applyStateToInputs(state);
  } catch (err) {
    console.error("저장된 상태를 불러오지 못했습니다.", err);
  }
}

// [초기화] 버튼 -> 확인 모달 표시
function requestReset() {
  var overlay = document.getElementById("resetModalOverlay");
  if (overlay) overlay.classList.add("open");
}

// 모달 [아니오]
function cancelReset() {
  var overlay = document.getElementById("resetModalOverlay");
  if (overlay) overlay.classList.remove("open");
}

// 모달 [예] -> 최초 입력값으로 복원 + 저장된 쿠키 삭제
function confirmReset() {
  applyStateToInputs(initialInputValues);
  deleteCookie(STATE_COOKIE_NAME);

  var overlay = document.getElementById("resetModalOverlay");
  if (overlay) overlay.classList.remove("open");
}
