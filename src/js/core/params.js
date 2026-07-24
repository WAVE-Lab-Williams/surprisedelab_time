/*
===============================================================
Defining Parameter Variables
===============================================================
*/

var stimFolder = 'src/assets/stimuli/window_fixed/'
// 'src/assets/stimuli/heads/' ## change to comment in correct path

var runIntro = true;
var runInstr = true;
var runExpt = true;
var runClose = true;
var runPreload = true;

// // for reproduce rectangle version
// var rectangleVer = true;

/*
---------------------------------------------------------------
Live tunable experiment hyperparameters (Sets Defaults)
---------------------------------------------------------------
Sets default DEFAULT values for adjustable experiment variables that may
later need to change while the experiment is still live.  
These defaults are used when running locally, or when an 
experiment has no backend config set. At runtime, the experiment pulls `config` 
from the WAVE backend (if available) and merges it OVER these defaults 
(see initExperiment() in timeline.js). A researcher can thus easily change
a one of these variables (via the setup_experiment.ipynb notebook / API)
instead of having to edit the file and do PRs.

*/
var CONFIG_DEFAULTS = { //WITHOUT PR CAN CHANGE
    number_of_repetitions: 1,
    base_people_race: ["W"],
    base_people_sex: ["F","M"],
    base_people_variation: ["1","2","3","4"],
    base_people_rotation: [0]
};

// Defining Core Variables that remain constant
var PRESTIM_DISP_TIME = 700;
var FIXATION_DISP_TIME = 700;
var POSTSTIM_DISP_TIME = 500;

// Variables for Participant Information
var estTotalRunTime = 6; // was 2 for single trial
var estDollars = 0.9; // was 0.30 for single trial
var participantType = 'prolific';
var completionCode = 'CN955H3L';
var prolific_url = 'https://app.prolific.com/submissions/complete?cc='+completionCode;

// WAVE Backend Configuration
var waveBackendUrl = 'https://wave-backend-production-8781.up.railway.app';
// var waveBackendUrl = 'http://localhost:8000';  // For local development

// initializing variables
var timelinebase = [];
var timelineintro = [];
var timelineinstr = [];
var timelineexpt = [];
var timelineclose = [];
var forPreload = [];
var full_check = false;
var w =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth;
var h =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    document.body.clientHeight;

// console.log(w,h);

// setting display image width
// var origWidth = 252; // for female body ver 
// var origHeight = 545; // for female body ver 
var origWidth = 3200; // for window ver
var origHeight = 1200; // for window ver
// var origWidth = 533; // for heads only ver 
// var origHeight = 400; // for heads only ver 
// var origWidth = 560; // for monitor ver
// var origHeight = 370; // for monitor ver
// var origWidth = 371; // for samebody ver
// var origHeight = 228; // for samebody ver
var imgWidth = origWidth
var imgHeight = ((imgWidth / origWidth) * origHeight)


