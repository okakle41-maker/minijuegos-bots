class GameAudioManager {

    constructor(){

        this.enabled = true;

        this.masterVolume = 0.8;

        this.sounds = {};

    }

    load(name,path){

        const audio = new Audio(path);

        audio.preload = "auto";

        audio.volume = this.masterVolume;

        this.sounds[name] = audio;

    }

    play(name){

        if(!this.enabled) return;

        const sound = this.sounds[name];

        if(!sound) return;

        sound.pause();

        sound.currentTime = 0;

        sound.play().catch(()=>{});

    }

    setVolume(volume){

        this.masterVolume = volume;

        Object.values(this.sounds).forEach(sound=>{

            sound.volume = volume;

        });

    }

    mute(){

        this.enabled = false;

    }

    unmute(){

        this.enabled = true;

    }

    toggle(){

        this.enabled = !this.enabled;

    }

}



const audioManager = new GameAudioManager();

window.audioManager = audioManager;

audioManager.load("hover","audio/ui_hover.mp3"); //
audioManager.load("click","audio/ui_click.mp3");//
audioManager.load("open","audio/ui_open.mp3"); //
audioManager.load("back","audio/ui_back.mp3"); //
audioManager.load("save","audio/ui_save.mp3"); //

audioManager.load("perfect","audio/perfect.mp3"); //
audioManager.load("good","audio/good.mp3"); //
audioManager.load("miss","audio/miss.mp3"); //
audioManager.load("gameover","audio/gameover.mp3"); //

audioManager.load("step1","audio/step1.mp3");//
audioManager.load("step2","audio/step2.mp3");//
audioManager.load("step3","audio/step3.mp3");//
audioManager.load("wall","audio/maze_wall.mp3");
audioManager.load("beep","audio/maze_beep.mp3"); //
audioManager.load("levelup","audio/maze_levelup.mp3");//

audioManager.load("key1","audio/key1.mp3");
audioManager.load("key2","audio/key1.mp3");
audioManager.load("key3","audio/key1.mp3");

audioManager.load("tone1", "audio/tone1.mp3");
audioManager.load("tone2", "audio/tone2.mp3");
audioManager.load("tone3", "audio/tone3.mp3");
audioManager.load("tone4", "audio/tone4.mp3");
audioManager.load("tone5", "audio/tone5.mp3");
audioManager.load("tone6", "audio/tone6.mp3");
