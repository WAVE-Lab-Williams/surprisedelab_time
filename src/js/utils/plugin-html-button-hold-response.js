/**
 * plugin-html-button-hold-response
 *
 * A jsPsych plugin adapted from html-button-response that measures how long
 * a button is held down. Tracks:
 *   - press_time:    ms from trial start to mousedown/touchstart
 *   - release_time:  ms from trial start to mouseup/touchend
 *   - hold_duration: release_time - press_time (ms)
 *   - response:      index of the button that was held
 *
 * The button gives a visual "active" signal while held (via CSS class
 * "jspsych-btn-held"), and the trial ends on release (mouseup / touchend).
 *
 * Compatible with jsPsych v8.x
 *
 * Usage:
 *   <script src="plugin-html-button-hold-response.js"></script>
 *
 *   var trial = {
 *     type: jsPsychHtmlButtonHoldResponse,
 *     stimulus: '<p>Hold the button for as long as you feel confident.</p>',
 *     choices: ['Respond'],
 *     // Optional: require a minimum hold time before release counts (ms)
 *     min_hold_duration: 0,
 *   };
 * 
 * Personally, I would default to using plugin-html-button-hold-retry, and just set number of allowed retries to null. It's more versatile. But keeping this here for posterity.
 */

var jsPsychHtmlButtonHoldResponse = (function (jspsych) {
  "use strict";

  const info = {
    name: "html-button-hold-response",
    version: "1.0.0",
    parameters: {
      /** HTML string to display as the stimulus. */
      stimulus: {
        type: jspsych.ParameterType.HTML_STRING,
        default: undefined,
      },
      /** Labels for the buttons. Each string produces one button. */
      choices: {
        type: jspsych.ParameterType.STRING,
        array: true,
        default: undefined,
      },
      /**
       * A function that receives (choice, index) and returns an HTML string
       * for the button. Defaults to a standard jspsych-btn button.
       */
      button_html: {
        type: jspsych.ParameterType.FUNCTION,
        default: function (choice, _index) {
          return `<button class="jspsych-btn">${choice}</button>`;
        },
      },
      /** HTML string shown below the stimulus (e.g. instructions). */
      prompt: {
        type: jspsych.ParameterType.HTML_STRING,
        default: null,
      },
      /** How long to show the stimulus before ending the trial (ms). Null = wait for response. */
      stimulus_duration: {
        type: jspsych.ParameterType.INT,
        default: null,
      },
      /** Maximum time to wait for a complete press-and-release (ms). Null = no limit. */
      trial_duration: {
        type: jspsych.ParameterType.INT,
        default: null,
      },
      /**
       * Minimum hold duration required for the release to count (ms).
       * If the participant releases before this time, the button returns to
       * its normal state and they must press again.
       */
      min_hold_duration: {
        type: jspsych.ParameterType.INT,
        default: 10,
      },
      /** Layout of buttons: 'flex' or 'grid'. */
      button_layout: {
        type: jspsych.ParameterType.STRING,
        default: "flex",
      },
      /** Number of grid columns (only used when button_layout = 'grid'). */
      grid_columns: {
        type: jspsych.ParameterType.INT,
        default: null,
      },
      /** If true, the trial ends as soon as a valid hold is completed. */
      response_ends_trial: {
        type: jspsych.ParameterType.BOOL,
        default: true,
      },
      /** If true, buttons are disabled once a valid response is recorded. */
      enable_button_after_response: {
        type: jspsych.ParameterType.BOOL,
        default: false,
      },
    },
    data: {
      /** The HTML content of the stimulus. */
      stimulus: { type: jspsych.ParameterType.HTML_STRING },
      /** Index of the button that was held (0-based). */
      response: { type: jspsych.ParameterType.INT },
      /** Time from trial start to mousedown/touchstart (ms). */
      press_time: { type: jspsych.ParameterType.INT },
      /** Time from trial start to mouseup/touchend (ms). */
      release_time: { type: jspsych.ParameterType.INT },
      /** Total hold duration in ms (release_time - press_time). */
      hold_duration: { type: jspsych.ParameterType.INT },
      /** Conventional rt field = press_time, for compatibility with other plugins. */
      rt: { type: jspsych.ParameterType.INT },
    },
  };

  class HtmlButtonHoldResponsePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      // ── Build HTML ──────────────────────────────────────────────────────────

      let html = `<div id="jspsych-html-button-hold-response-stimulus">${trial.stimulus}</div>`;

      // Button wrapper
      const layoutStyle =
        trial.button_layout === "grid" && trial.grid_columns
          ? `display:grid; grid-template-columns: repeat(${trial.grid_columns}, 1fr);`
          : `display:flex; flex-wrap:wrap; justify-content:center;`;

      html += `<div id="jspsych-html-button-hold-response-btngroup" style="${layoutStyle}">`;

      for (let i = 0; i < trial.choices.length; i++) {
        const btnHtml = trial.button_html(trial.choices[i], i);
        html += `<div class="jspsych-html-button-hold-response-button" 
                      data-choice="${i}" 
                      style="display:inline-block; margin:4px;">
                   ${btnHtml}
                 </div>`;
      }
      html += `</div>`;

      if (trial.prompt !== null) {
        html += trial.prompt;
      }

      display_element.innerHTML = html;

      // ── Inline style for held state ─────────────────────────────────────────
      // We inject a small <style> block so the "held" class works without
      // requiring changes to jspsych.css.
      const styleEl = document.createElement("style");
      styleEl.textContent = `
        .jspsych-btn-held {
          filter: brightness(0.8);
          transform: scale(0.97);
          box-shadow: inset 0 2px 6px rgba(0,0,0,0.35);
          transition: filter 0.05s, transform 0.05s, box-shadow 0.05s;
        }
      `;
      display_element.appendChild(styleEl);

      // ── State ───────────────────────────────────────────────────────────────
      let response = {
        button: null,
        press_time: null,
        release_time: null,
        hold_duration: null,
      };
      let trialComplete = false;
      let currentPressIndex = null; // which button is currently held

      const startTime = performance.now();

      // ── Helper: get button elements ─────────────────────────────────────────
      const getButtonEl = (index) => {
        const wrapper = display_element.querySelector(
          `.jspsych-html-button-hold-response-button[data-choice="${index}"]`
        );
        return wrapper ? wrapper.querySelector("button, [role=button]") ?? wrapper.firstElementChild : null;
      };

      // ── Finish trial ────────────────────────────────────────────────────────
      const endTrial = () => {
        if (trialComplete) return;
        trialComplete = true;

        // Cancel any lingering timers
        this.jsPsych.pluginAPI.clearAllTimeouts();

        // Clean up event listeners
        display_element
          .querySelectorAll(".jspsych-html-button-hold-response-button")
          .forEach((wrapper) => {
            const btn = wrapper.querySelector("button, [role=button]") ?? wrapper.firstElementChild;
            if (btn) {
              btn.removeEventListener("mousedown", onMouseDown);
              btn.removeEventListener("touchstart", onTouchStart);
            }
          });
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("touchend", onTouchEnd);

        const trialData = {
          stimulus: trial.stimulus,
          response: response.button,
          press_time: response.press_time !== null ? Math.round(response.press_time) : null,
          release_time: response.release_time !== null ? Math.round(response.release_time) : null,
          hold_duration: response.hold_duration !== null ? Math.round(response.hold_duration) : null,
          rt: response.press_time !== null ? Math.round(response.press_time) : null,
        };

        display_element.innerHTML = "";
        this.jsPsych.finishTrial(trialData);
      };

      // ── Mouse / touch handlers ───────────────────────────────────────────────

      const onPress = (buttonIndex) => {
        if (trialComplete) return;
        currentPressIndex = buttonIndex;
        response.press_time = performance.now() - startTime;

        const btn = getButtonEl(buttonIndex);
        if (btn) btn.classList.add("jspsych-btn-held");
      };

      const onRelease = () => {
        if (trialComplete || currentPressIndex === null) return;

        const releaseTime = performance.now() - startTime;
        const holdDuration = releaseTime - response.press_time;

        const btn = getButtonEl(currentPressIndex);
        if (btn) btn.classList.remove("jspsych-btn-held");

        // Check minimum hold requirement
        if (holdDuration < trial.min_hold_duration) {
          // Not long enough — reset and let them try again
          currentPressIndex = null;
          response.press_time = null;
          return;
        }

        // Valid response
        response.button = currentPressIndex;
        response.release_time = releaseTime;
        response.hold_duration = holdDuration;
        currentPressIndex = null;

        if (!trial.enable_button_after_response) {
          // Disable all buttons
          display_element
            .querySelectorAll(".jspsych-html-button-hold-response-button button")
            .forEach((b) => {
              b.setAttribute("disabled", "disabled");
            });
        }

        if (trial.response_ends_trial) {
          endTrial();
        }
      };

      const onMouseDown = (e) => {
        const wrapper = e.currentTarget.closest(
          ".jspsych-html-button-hold-response-button"
        );
        if (!wrapper) return;
        e.preventDefault(); // prevent focus issues
        onPress(parseInt(wrapper.dataset.choice));
      };

      const onMouseUp = () => {
        if (currentPressIndex !== null) onRelease();
      };

      const onTouchStart = (e) => {
        const wrapper = e.currentTarget.closest(
          ".jspsych-html-button-hold-response-button"
        );
        if (!wrapper) return;
        e.preventDefault();
        onPress(parseInt(wrapper.dataset.choice));
      };

      const onTouchEnd = () => {
        if (currentPressIndex !== null) onRelease();
      };

      // Attach listeners to each button
      display_element
        .querySelectorAll(".jspsych-html-button-hold-response-button")
        .forEach((wrapper) => {
          const btn =
            wrapper.querySelector("button, [role=button]") ??
            wrapper.firstElementChild;
          if (btn) {
            btn.addEventListener("mousedown", onMouseDown);
            btn.addEventListener("touchstart", onTouchStart, { passive: false });
          }
        });

      // Release events go on document so a drag-off still registers
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("touchend", onTouchEnd);

      // ── Optional: hide stimulus after stimulus_duration ──────────────────────
      if (trial.stimulus_duration !== null) {
        this.jsPsych.pluginAPI.setTimeout(() => {
          const stimEl = display_element.querySelector(
            "#jspsych-html-button-hold-response-stimulus"
          );
          if (stimEl) stimEl.style.visibility = "hidden";
        }, trial.stimulus_duration);
      }

      // ── Optional: end trial after trial_duration ─────────────────────────────
      if (trial.trial_duration !== null) {
        this.jsPsych.pluginAPI.setTimeout(endTrial, trial.trial_duration);
      }
    } // end trial()

    simulate(trial, simulation_mode, simulation_options, load_callback) {
      if (simulation_mode === "data-only") {
        load_callback();
        this._simulateResponse(trial, simulation_options);
      } else if (simulation_mode === "visual") {
        this._simulateVisual(trial, simulation_options, load_callback);
      }
    }

    _simulateResponse(trial, simulation_options) {
      const defaults = {
        button: Math.floor(Math.random() * trial.choices.length),
        press_time: Math.round(Math.random() * 300 + 200),
        hold_duration: Math.round(
          Math.max(trial.min_hold_duration, Math.random() * 500 + 100)
        ),
      };
      const sim = Object.assign({}, defaults, simulation_options?.data ?? {});
      const release_time = sim.press_time + sim.hold_duration;

      this.jsPsych.finishTrial({
        stimulus: trial.stimulus,
        response: sim.button,
        press_time: sim.press_time,
        release_time: release_time,
        hold_duration: sim.hold_duration,
        rt: sim.press_time,
      });
    }

    _simulateVisual(trial, simulation_options, load_callback) {
      const display_element = this.jsPsych.getDisplayElement();
      this.trial(display_element, trial);
      load_callback();

      const defaults = {
        button: Math.floor(Math.random() * trial.choices.length),
        press_time: Math.round(Math.random() * 300 + 200),
        hold_duration: Math.round(
          Math.max(trial.min_hold_duration, Math.random() * 500 + 100)
        ),
      };
      const sim = Object.assign({}, defaults, simulation_options?.data ?? {});

      // Simulate mousedown then mouseup after hold_duration
      this.jsPsych.pluginAPI.setTimeout(() => {
        const wrapper = display_element.querySelector(
          `.jspsych-html-button-hold-response-button[data-choice="${sim.button}"]`
        );
        if (wrapper) {
          const btn =
            wrapper.querySelector("button, [role=button]") ??
            wrapper.firstElementChild;
          if (btn) btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        }
      }, sim.press_time);

      this.jsPsych.pluginAPI.setTimeout(() => {
        document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      }, sim.press_time + sim.hold_duration);
    }
  }

  HtmlButtonHoldResponsePlugin.info = info;
  return HtmlButtonHoldResponsePlugin;
})(jsPsychModule);