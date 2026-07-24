/*
===============================================================
Table of Contents (*TOC)
===============================================================
1. JSPsych Init, and onFinish (*sec_init)
2. Introduction Section (*sec_intro)
    2a. Push Intro Trials to timeline_intro (*push_intro)
3. Instruction Section + Demo Trials (*sec_instr)
    3a. Set Preload Images for Instr + Demo (*preload_instr)
    3b. Push Instr Trials to timeline_instr (*push_instr)
4. Experiment Section (*sec_expt)
    4a. Define Factors + Expt Design (*factors)
    4b. Set Preload Images for Experiment
    4c. Determine Expt Trials + logic (*exptTrials)
5. Closing Section (*sec_closing)
6. Run Expt (*sec_run)
    6a. Define Preload plugin
    6b. Combine all timelines


*/

/*
===============================================================
JSPsych Init, and onFinish (*sec_init)
===============================================================
*/

/* initialize jsPsych */
var jsPsych = initJsPsych({
    on_trial_finish: function(data) {
        // console.log(JSON.stringify(data));
        data.participant_id = workerID;
        
        // Process data through WAVE client if available
        if (window.waveClient) {
            window.waveClient.processTrialData(data);
        }
    },
    on_finish: function() {
        // Handle experiment completion through WAVE client if available
        if (window.waveClient) {
            window.waveClient.handleCompletion();
        } else {
            jsPsych.data.displayData();
        }
    },
    on_interaction_data_update: function () {
        var interaction_data = jsPsych.data
            .getInteractionData()
            .last(1)
            .values()[0].event;
        if (interaction_data == 'fullscreenexit') {
            console.log('Fullscreen Exit detected');
            full_check = false;
        } else if (interaction_data == 'fullscreenenter') {
            console.log('Fullscreen problem now solved');
            full_check = true;
        }
    },
});

/*
===============================================================
Introduction Section (*sec_intro)
===============================================================
*/

var welcome = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function() {
        return welcometext();
    },
    choices: ['Next'],
    data: {
        trial_category: 'welcome',
        screenWidth: String(w),
        screenHeight: String(h),
        clock: function () {
            var startTime = new Date().toLocaleString('en-US', {
                timeZone: 'America/New_York',
            });
            console.log('Start Time' + startTime);
            return startTime;
        }, // clock ends
    }, // data ends
    on_finish: function() {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            console.log("Uh oh, this is a mobile device");
        } else {
            console.log("Desktop device");
        }
    }, // on_finish ends
};

var consent = {
    type: jsPsychHtmlKeyboardResponse,
    choices: ['y'],
    stimulus: consentForm(participantType),
    prompt: '<h3>PRESS THE Y KEY TO CONSENT</h3><p></p><p></p>',
    data: { trial_category: 'consent' },
};

// First check for PROLIFIC_PID, then participant_id, then randomly generate id for now
var workerID = getURLParameter('PROLIFIC_PID');
if (workerID === 'no_query') {
    workerID = getURLParameter('participant_id');
}

if (workerID !== 'no_query') {
    console.log('Worker singID captured from URL:', workerID);
} else {
    workerID = 'no_query_worker'+ Math.floor(Math.random() * 90000 + 10000);
    console.warn('⚠️ No participant ID found in URL - randomly generated:', workerID);
}

var id = {
    type: jsPsychSurveyHtmlForm,
    html: requestIDinput(participantType, workerID),
    button_label: ['Submit'],
    data: { trial_category: 'id_info' },
    on_finish: function (data) {
        var respObj = data.response;
        for (var key in respObj) {
            if (respObj[key] == workerID) {
                console.log(
                    'The manual type matches the query capture, going with query input.',
                );
            } else if (workerID.startsWith('no_query')) {
                console.log(
                    `The query was not successfully captured, or there was nothing to query, now going to add the manual input to the end of the no query. workerID now = ${workerID + respObj[key]}`,
                );
                workerID = workerID + respObj[key];
            } else {
                console.log(
                    'The manual type differed from the query capture, and for some reason no_query was no generated, so going with manual input, whatever it is. If this happens, something has gone wrong.',
                );
                workerID = respObj[key];
            }
        } /*end of for loop*/
        // Retroactively update all prior trials with the finalized workerID
        jsPsych.data.get().addToAll({participant_id: workerID});
    } /*end of on_finish*/,
}; /* end of id*/

/* ------- timeline intro push (*push_intro) -------------- */
timelineintro.push(welcome);
timelineintro.push(consent);
timelineintro.push(id);
timelineintro.push({
    type: jsPsychFullscreen,
    fullscreen_mode: true,
    message: fullscreenMessage,
    on_finish: function () {
        full_check = true;
    },
});

/*
===============================================================
INSTR PROCEDURE (*sec_instr)
===============================================================
*/

/* -------  Set Preload Images for Instr + Demo (*preload_instr) -------------- */


// // make sure to load any images you need for the demo itself. Usually you have different demo images than the main expt, such that you don't give away the content of the expt itself (but still give the participant practice and familiarity with the task. In this case, though, the demo images themselves are identical to the main expt. Variable names are the only difference.
var demo_image_race= ["demo"];
var demo_image_sex= ["gray"];
var demo_image_variation = ["head"];
var demo_display_durations = [2000];
var demo_image_rotation = [0];
forPreload.push(`${stimFolder}${demo_image_race}${demo_image_sex}-${demo_image_variation}.png`);

//decide what the parameters for the demo trial should be. Sometimes you hardcode this, sometimes you randomly choose from the options you defined above.
var thisDemoDispDuration = randomChoice(demo_display_durations,1)[0];

/* -------  Push Instr + Demo Trials to timeline_instr (*push_instr) -------------- */
var instrContent = loadInstrContent();

// // single trial version
// var instructions = {
//     type: jsPsychInstructions,
//     pages: instrContent,
//     show_clickable_nav: true,
//     allow_keys: false,
//     allow_backward: false,
//     delay_time: function(){
//         const calculated_delays = [];
//         for (let i = 0; i < instrContent.length; i++) {
//             calculated_delays.push(calculate_delay_time(count_words(instrContent[i]),60));
//         }
//         return calculated_delays
//     }, // end delay_time
// };
// timelineinstr.push(instructions);

var demoTrialIndex = 2; // this should be the number of the instructions where you want the demo to appear RIGHT BEFORE
var [instrContent_beforedemo,instrContent_afterdemo] = cutArray(instrContent,demoTrialIndex);

var instructions_precut = {
    type: jsPsychInstructions,
    pages: instrContent_beforedemo,
    show_clickable_nav: true,
    allow_keys: false,
    allow_backward: false,
    delay_time: function(){
        const calculated_delays = [];
        for (let i = 0; i < instrContent.length; i++) {
            calculated_delays.push(calculate_delay_time(count_words(instrContent[i]),60));
        }
        return calculated_delays
    }, // end delay_time
};

var instructions_postcut = {
    type: jsPsychInstructions,
    pages: instrContent_afterdemo,
    show_clickable_nav: true,
    allow_keys: false,
    allow_backward: false,
    delay_time: function(){
        const calculated_delays = [];
        for (let i = demoTrialIndex; i < instrContent.length; i++) {
            calculated_delays.push(calculate_delay_time(count_words(instrContent[i]),60));
        }
        return calculated_delays
    }, // end delay_time
};

timelineinstr.push(instructions_precut);
runSingleTrial(demo_image_race,
    demo_image_sex,
    demo_image_variation,
    demo_image_rotation,
    thisDemoDispDuration,
    0,
    timelineinstr,
    "prac") // pushesyour demo trial
timelineinstr.push(instructions_postcut);



/*
===============================================================
EXPERIMENT SECTION (*sec_expt)
===============================================================
*/

/* -------- defining factors && exptdesign (*factors) --------*/
// Note: `config` itself isn't resolved until startExperiment() awaits the WAVE
// backend (*sec_run below), so this just defines how to build `factors` and creates `factorial_design` --
// it's called from startExperiment() once config is actually available.
function buildExptDesign(config) {

    // Expt variables that are not able to change (without PR)
    var poss_disp_duration = [500,750,1000,1250,1500];
    // var poss_disp_duration = [500, 1375, 2250, 3125, 4000]; // increment by 875
   
    // Expt variables that ARE able to change via config, default set in params.js.
    //      Config numbers arrive as floats, so make sure to read in correctly asInteger/asNumber
    //      see the helpers in src/js/utils/standard-functions.js.
    var poss_people_race = randomChoice(asList(config.base_people_race, CONFIG_DEFAULTS.base_people_race), 1)
    var poss_people_sex = asList(config.base_people_sex, CONFIG_DEFAULTS.base_people_sex);
    var poss_people_variation = asList(config.base_people_variation, CONFIG_DEFAULTS.base_people_variation);
    var poss_people_rotation = asList(config.base_people_rotation, CONFIG_DEFAULTS.base_people_rotation);
    var n_reps = asInteger(config.number_of_repetitions, CONFIG_DEFAULTS.number_of_repetitions);
   
    var factors = {
        people_race: poss_people_race,
        people_sex: poss_people_sex,
        people_variation: poss_people_variation,
        disp_duration: poss_disp_duration,
        people_rotation: poss_people_rotation
    }

    var factorial_design = jsPsych.randomization.factorial(factors, n_reps);

    /* -------  Set Preload Images for Expt (*preload_expt) -------------- */
    for (var i = 0; i < poss_people_race.length; i++) {
        for (var j = 0; j < poss_people_sex.length; j++) {
            for (var k = 0; k < poss_people_variation.length; k++) {
                forPreload.push(`${stimFolder}${poss_people_race[i]}${poss_people_sex[j]}-${poss_people_variation[k]}.png`);
            } // end k loop
        } // end j loop
    } // end i loop

    return factorial_design
}




/*
===============================================================
CLOSING SECTION (*sec_closing)
===============================================================
*/

var feedback_summary = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {

    var trials = jsPsych.data.get().filter({trial_category: 'answerexpt'});
    var correct_trials = trials.filter({thisAcc: 1});
    var accuracy = Math.round(correct_trials.count() / trials.count() * 100);
    var rt = Math.round(correct_trials.select('rt').mean());

    return `<p>You responded correctly on ${accuracy}% of the trials.</p>
        <p>Your average response time was ${rt}ms.</p>
        <p>Press any key to continue to the next part of the study.</p>`;
    }
};

var debrief_qs = {
    type: jsPsychSurveyHtmlForm,
    html: debriefForm(),
    button_label: ['Submit'],
    data: {
        trial_category: 'debriefexpt',
        endTime: function () {
            var endTime = new Date().toLocaleString('en-US', {
                timeZone: 'America/New_York',
            });
            console.log('End Time' + endTime);
            return endTime;
        },
    } // data ends
}

var closing = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: closingText(participantType),
    choices: [' '],
    data: { trial_category: 'closing' },
    on_finish: function(){
        if (participantType == 'prolific') {
            window.open(prolific_url, '_blank');
        }
    }, // on finish complete
};

// timelineclose.push(feedback_summary);
timelineclose.push(debrief_qs);
timelineclose.push({ type: jsPsychFullscreen, fullscreen_mode: false });
timelineclose.push(closing);

/*
===============================================================
Run Expt (*sec_run)
===============================================================
*/

// The experiment can pull a few settings from the WAVE backend (e.g. how many
// times to repeat the trial design). Because that's a network request, we wait
// for it here, then build the trials and start. Everything above this point is
// plain and editable by hand -- only this run step needs to be async.
async function startExperiment() {

    // Resolve settings: this experiment's backend config merged over the
    //    defaults in params.js (falls back to the defaults if WAVE is offline).
    var config = window.waveClient
        ? await window.waveClient.getConfig()
        : CONFIG_DEFAULTS;

    // Save the exact settings used onto every data row, for the record.
    jsPsych.data.addProperties({ experiment_config: JSON.stringify(config) });

    var full_design = buildExptDesign(config);
    console.log(full_design);

    /* ------- timeline expt push (*pushExpt ) -------------- */
    var jitter;
    for (var elem = 0; elem < full_design.length; elem++) {
    // for (var elem = 0; elem < 1; elem++) {
        jitter = randomChoice([-100,-50, 0, 50, 100], 1)[0]; // jitter for the 500-1500 range
        // jitter = randomChoice([-400,-200, 0, 200, 400], 1)[0]; // jitter for the 500-1500 range
        runSingleTrial(
            full_design[elem].people_race,
            full_design[elem].people_sex,
            full_design[elem].people_variation,
            full_design[elem].people_rotation,
            full_design[elem].disp_duration+jitter,
            elem,
            timelineexpt,
            'expt',
        );
    }

    // Assemble the timeline (toggle sections with the run* flags in params.js).
    if (runPreload) {
        var preload = {
            type: jsPsychPreload,
            images: forPreload,
            auto_preload: true,
            show_detailed_errors: true,
            on_error: function(file) {
                console.log('Error: ',file);
            },
            on_success: function(file) {
                console.log('Success: ',file);
            },
            message: 'Please wait while the experiment loads...'
        }
        timelinebase = timelinebase.concat(preload);
    }
    if (runIntro) { timelinebase = timelinebase.concat(timelineintro) }
    if (runInstr) { timelinebase = timelinebase.concat(timelineinstr) }
    if (runExpt) { timelinebase = timelinebase.concat(timelineexpt) }
    if (runClose) { timelinebase = timelinebase.concat(timelineclose) }

    jsPsych.run(timelinebase);
}

// Start once the page (and the WAVE client module) have loaded.
window.addEventListener('DOMContentLoaded', startExperiment);