/*
===============================================================
PUSHING/RUNNING A CUSTOM SINGLE TRIAL (*singleTrial)
===============================================================
*/
function runSingleTrial(
    personRace,
    personSex,
    personVariation,
    dispDuration,
    timelineTrialsToPush,
    trialType,
) {

    /*--------------------------- General Utility ---------------------------*/
    var checkScreen = {
        type: jsPsychFullscreen,
        message:
            '<p>Unfortunately, it appears you are no longer in fullscreen mode. Please make sure to remain in fullscreen mode. <br>Click on the button to fullscreen the experiment again and proceed.</p>',
        fullscreen_mode: true,
        button_label: 'Resume',
    };

    var if_notFull = {
        timeline: [checkScreen],
        conditional_function: function () {
            if (full_check == false) {
                return true;
            } else {
                return false;
            }
        },
    };

    var cursor_off = {
        type: jsPsychCallFunction,
        func: function () {
            document.body.style.cursor = 'none';
        },
    };

    var cursor_on = {
        type: jsPsychCallFunction,
        func: function () {
            document.body.style.cursor = 'auto';
        },
    };

    /*--------------------------- Experiment specific variables ---------------------------*/
    if (rectangleVer == true){
        var thisStim = `${stimFolder}${personRace}${personSex}-${personVariation}.png`
        var sliderStim = `${stimFolder}gray_rectangle.png`
        var persistent_prompt = `<div style="position: fixed; top: 25px; left: 50%; width: 90%; transform: translateX(-50%); text-align: center;">Now use the slider below (you can click and drag the slider) to make the gray rectangle match the exact size of the image you just saw to the best of your ability. We know this is hard, do your best! (The "Continue" button is at the bottom of the page)</div>`;
    } else {
        var thisStim = `${stimFolder}${personRace}${personSex}-${personVariation}.png`
        var sliderStim = `${stimFolder}gray_rectangle.png`
        var persistent_prompt = `<div style="position: fixed; top: 25px; left: 50%; width: 90%; transform: translateX(-50%); text-align: center;">Now use the slider below (you can click and drag the slider) to recreate the exact size of the image you just saw, to the best of your ability. Do your best! (The "Continue" button is at the bottom of the page)</div>`;
    }

    /* target image size */
    // let tar_size = randomIntFromRange(40, 100);
    let tar_size = 100;
    let resize_decimal = tar_size*.01;

    let target_width = Math.floor(imgWidth * resize_decimal);
    let target_height = Math.floor(imgHeight * resize_decimal);

    let target_x_random = randomIntFromRange(100, w-100-target_width); // accounts for img dims to not go off screen
    let target_y_random = randomIntFromRange(50, h-50-target_height);

    console.log(w)
    console.log(`Where the left of the image will be positioned target_x_random: ${target_x_random}`)
    console.log(`target_width: ${target_width}`)
    console.log(h)
    console.log(`Where the top of the image will be positioned target_y_random: ${target_y_random}`)
    console.log(`target_height: ${target_height}`)

    var holdResponse = {
        type: jsPsychHtmlButtonHoldResponse,
        stimulus: `Now please try to <b>reproduce how long</b> the image stayed on screen. Click and hold down the button below to do so.<p>For example, if you thought the image stayed on screen for 5 seconds, try your best to click and hold the button for five seconds.</p> <p>Releasing the button will <b>automatically submit</b> your response!</p><p>You have <b>only ONE try!</b></p>`,
        choices: ["Click, hold, and release this button for the right amount of time!"],
        show_hold_duration_feedback: false,
        retries_allowed: null, // change to a number of allowed retries. Default is null.
        data: {
            trial_category: 'answer'+trialType,
            trial_stimulus: thisStim,
            correct_response: dispDuration,
            person_race: personRace,
            person_sex: personSex,
            person_variation: personVariation,
            person_disp_duration: dispDuration,
            target_x_position: target_x_random,
            target_y_position: target_y_random,
        }, // data end
        on_finish: function(data){
            data.thisDifference = data.hold_duration - data.correct_response
        } // on finish end
    }; // holdResponse end

    var dispImg = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `<div style="position: absolute; top: ${target_y_random}px; right: ${target_x_random}px;">`+
            `<img src="${thisStim}" style="width:${target_width}px;" />` + 
            `</div>`,
        choices: "NO_KEYS",
        trial_duration: dispDuration,
        // prompt: `${persistent_prompt}`,
        data: {
            trial_category: 'dispImg'+trialType,
            // trial_stimulus: thisStim,
            // trial_duration: dispDuration,
            // target_width: target_width,
            // target_height: target_height,
        }, // data end
    }; // dispImg end

    var prestim = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: "",
        choices: "NO_KEYS",
        trial_duration: PRESTIM_DISP_TIME,
        data: {
            trial_category: 'prestim_ISI' + trialType,
        }
    };

     var poststim = {
        type: jsPsychHtmlKeyboardResponse,
        // stimulus: `${persistent_prompt}`,
        stimulus: ``,
        choices: "NO_KEYS",
        trial_duration: POSTSTIM_DISP_TIME,
        data: {
            trial_category: 'poststim_ISI' + trialType,
        }
    };

    var fixation = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `<div style="font-size:60px;">+</div>`,
        choices: "NO_KEYS",
        trial_duration: FIXATION_DISP_TIME,
        data: {
            trial_category: 'fixation' + trialType,
        }
    };


    /*--------------------------- push single trial sequence ---------------------------*/

    timelineTrialsToPush.push(if_notFull);
    timelineTrialsToPush.push(cursor_off);
    timelineTrialsToPush.push(prestim);
    timelineTrialsToPush.push(fixation);
    timelineTrialsToPush.push(dispImg);
    timelineTrialsToPush.push(poststim)
    timelineTrialsToPush.push(cursor_on);
    timelineTrialsToPush.push(holdResponse);


}

