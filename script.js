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

function renderBoundInput(input) {
  var targetId = input.dataset.bind;
  var target = document.getElementById(targetId);
  if (!target) return;

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
}

function bindInputs() {
  document
    .querySelectorAll("[data-bind]")
    .forEach(function (input) {
      input.addEventListener("input", function () {
        renderBoundInput(input);
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
      wrap.__imgState = state;

      wrap.__setImgTransform = function (nextState) {
        if (!nextState) return;
        state.scale = nextState.scale || 1;
        state.offsetX = nextState.offsetX || 0;
        state.offsetY = nextState.offsetY || 0;
        clamp();
        apply();
      };

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
  captureInitialState();
  bindInputs();
  bindSnippet();
  bindImageInputs();
  bindImageEditing();
  loadSavedState();
  runLayoutChecks();
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

// ---------------------------------------------------------
// 상태 저장 / 초기화
// ---------------------------------------------------------

var SAVE_STORAGE_KEY = "hunee-pair-frame-state-v1";

// 페이지 최초 로드 시점의 값(초기화 버튼이 되돌아갈 기준)
var initialState = null;

function getAllTextInputs() {
  return Array.prototype.slice.call(
    document.querySelectorAll("[data-bind]"),
  );
}

function getSnippetInput() {
  return document.getElementById("snippet-input");
}

function getAllImageWraps() {
  return Array.prototype.slice.call(
    document.querySelectorAll(".img-editable"),
  );
}

// 현재 DOM 상태를 하나의 직렬화 가능한 객체로 수집
function collectCurrentState() {
  var state = {
    texts: {},
    snippet: "",
    stackMode: false,
    images: {},
  };

  getAllTextInputs().forEach(function (input) {
    state.texts[input.dataset.bind] = input.value;
  });

  var snippetInput = getSnippetInput();
  if (snippetInput) {
    state.snippet = snippetInput.value;
  }

  var stackToggle = document.getElementById("stackModeToggle");
  state.stackMode = !!(stackToggle && stackToggle.checked);

  getAllImageWraps().forEach(function (wrap) {
    var layer = wrap.querySelector(".img-fill");
    if (!layer) return;
    var hasImage = wrap.classList.contains("has-image");
    if (!hasImage) return;

    var bg = layer.style.backgroundImage; // 'url("data:...")'
    var match = bg && bg.match(/^url\((['"]?)(.*)\1\)$/);
    var dataUrl = match ? match[2] : "";
    if (!dataUrl) return;

    state.images[layer.id] = {
      dataUrl: dataUrl,
      naturalW: wrap.__naturalW || 0,
      naturalH: wrap.__naturalH || 0,
      imgState: wrap.__imgState
        ? {
            scale: wrap.__imgState.scale,
            offsetX: wrap.__imgState.offsetX,
            offsetY: wrap.__imgState.offsetY,
          }
        : null,
    };
  });

  return state;
}

// 페이지 로드시 최초 상태(HTML 기본값)를 기록해 둔다.
// 이미지는 최초 로드시 비어 있으므로 텍스트/토글 값만 기록.
function captureInitialState() {
  initialState = collectCurrentState();
}

// state 객체를 DOM에 반영
function applyState(state) {
  if (!state) return;

  // 텍스트 입력값 복원
  getAllTextInputs().forEach(function (input) {
    var key = input.dataset.bind;
    if (Object.prototype.hasOwnProperty.call(state.texts || {}, key)) {
      input.value = state.texts[key];
      renderBoundInput(input);
    }
  });

  // 설명(3줄 스니펫) 복원
  var snippetInput = getSnippetInput();
  if (snippetInput && typeof state.snippet === "string") {
    snippetInput.value = state.snippet;
    snippetInput.dispatchEvent(new Event("input"));
  }

  // 모바일 스택 뷰 토글 복원
  var stackToggle = document.getElementById("stackModeToggle");
  if (stackToggle) {
    stackToggle.checked = !!state.stackMode;
    toggleStackMode(stackToggle.checked);
  }

  // 이미지 복원
  getAllImageWraps().forEach(function (wrap) {
    var layer = wrap.querySelector(".img-fill");
    if (!layer) return;

    var saved = state.images ? state.images[layer.id] : null;

    if (!saved) {
      // 저장된 이미지가 없으면 비워둔다(초기 상태로 되돌릴 때 사용)
      layer.style.backgroundImage = "";
      layer.style.backgroundSize = "";
      layer.style.backgroundPosition = "";
      wrap.classList.remove("has-image");
      wrap.__naturalW = 0;
      wrap.__naturalH = 0;
      if (wrap.__imgState) {
        wrap.__imgState.scale = 1;
        wrap.__imgState.offsetX = 0;
        wrap.__imgState.offsetY = 0;
      }
      return;
    }

    layer.style.backgroundImage = "url(" + saved.dataUrl + ")";
    wrap.classList.add("has-image");
    wrap.__naturalW = saved.naturalW;
    wrap.__naturalH = saved.naturalH;

    if (typeof wrap.__setImgTransform === "function") {
      if (saved.imgState) {
        wrap.__setImgTransform(saved.imgState);
      } else if (typeof wrap.__resetImgTransform === "function") {
        wrap.__resetImgTransform();
      }
    }
  });

  runLayoutChecks();
}

// save
function manualSave() {
  try {
    var state = collectCurrentState();
    var json = JSON.stringify(state);
    window.localStorage.setItem(SAVE_STORAGE_KEY, json);
    showSavedOnButton();
  } catch (err) {
    console.error("상태 저장에 실패하였습니다.", err);
    alert(
      "상태 저장에 실패했습니다: " +
        (err && err.message ? err.message : String(err)),
    );
  }
}

// auto load
function loadSavedState() {
  var json;
  try {
    json = window.localStorage.getItem(SAVE_STORAGE_KEY);
  } catch (err) {
    console.error("저장된 상태를 불러오지 못했습니다.", err);
    return;
  }
  if (!json) return;

  try {
    var state = JSON.parse(json);
    applyState(state);
  } catch (err) {
    console.error("저장된 상태 파싱에 실패하였습니다.", err);
  }
}

// save button change
var saveBtnResetTimer = null;
var SAVE_BTN_DEFAULT_TEXT = "현재 상태 저장";
var SAVE_BTN_SAVED_TEXT = "저장됨";

function showSavedOnButton() {
  var btn = document.getElementById("saveBtn");
  if (!btn) return;

  btn.textContent = SAVE_BTN_SAVED_TEXT;
  btn.classList.add("is-saved");

  if (saveBtnResetTimer) clearTimeout(saveBtnResetTimer);
  saveBtnResetTimer = setTimeout(function () {
    btn.textContent = SAVE_BTN_DEFAULT_TEXT;
    btn.classList.remove("is-saved");
  }, 1800);
}

// reset

function requestReset() {
  var overlay = document.getElementById("resetModalOverlay");
  if (!overlay) return;
  overlay.classList.add("open");
}

function cancelReset() {
  var overlay = document.getElementById("resetModalOverlay");
  if (!overlay) return;
  overlay.classList.remove("open");
}

// reset yes
function confirmReset() {
  try {
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch (err) {
    console.error("저장된 상태 삭제에 실패하였습니다.", err);
  }

  if (initialState) {
    applyState(initialState);
  }

  cancelReset();
}
