(() => {

GameRegistry.register({
  id:          'maze-game',
  name:        'Maze',
  tag:         'NAVEGACIÓN',
  accent:      '#a3e635',
  icon:        '🌀',
  num:         '15',
  description: 'Encuentra la salida del laberinto antes de que se acabe el tiempo.',
  difficulty:  4,
  hidden:      true,     // sub-view, only accessible from skillchecks
  css:         'css/maze.css',

  init() {
    const start = document.getElementById('startMaze');
    if (!start) return;

    let mazeRunning = false, gameOver = false;
    let maze, player;
    let level = 1, mazeSize = 15;
    let time = 60, timer = null;

    function startTimer() {
      if (timer) { clearInterval(timer); timer = null; }
      time = 60;
      const timeEl = document.getElementById('mazeTime');
      timeEl.textContent = time;
      timeEl.classList.remove('danger');
      timer = setInterval(() => {
        time--;
        timeEl.textContent = time;
        timeEl.classList.toggle('danger', time <= 10);
        if (time === 10) audioManager.play('beep');
        if (time <= 0) {
          mazeRunning = false;
          clearInterval(timer); timer = null;
          time = 0; timeEl.textContent = '0';
          audioManager.play('gameover');
          const currentPlayer = player;
          player = null;
          const fog = document.getElementById('mazeFog');
          if (fog) { fog.style.transition = 'opacity .5s ease'; fog.style.opacity = '0'; }
          setTimeout(() => {
            document.getElementById('mazeResult').textContent = '⏱ Tiempo agotado';
            start.style.display = 'inline-block';
          }, 650);
        }
      }, 1000);
    }

    function startLevel() {
      mazeRunning = true; gameOver = false;
      maze   = MazeGenerator.generate(mazeSize, mazeSize);
      player = new MazePlayer(maze);
      MazeRenderer.render(maze, player);
      MazeRenderer.updateFog(player);
      document.getElementById('mazeLevel').textContent  = level;
      document.getElementById('mazeMoves').textContent  = 0;
      document.getElementById('mazeResult').textContent = '';
      startTimer();
    }

    start.addEventListener('click', () => {
      level = 1; mazeSize = 15;
      startLevel();
    });

    document.addEventListener('keydown', e => {
      const mazeView = document.getElementById('maze-game');
      if (!player || !mazeView || mazeView.classList.contains('hidden')) return;
      let moved = false;
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup':    moved = player.move(0, -1); break;
        case 's': case 'arrowdown':  moved = player.move(0,  1); break;
        case 'a': case 'arrowleft':  moved = player.move(-1, 0); break;
        case 'd': case 'arrowright': moved = player.move( 1, 0); break;
        default: return;
      }
      if (!moved) return;
      const step = Math.floor(Math.random() * 3) + 1;
      audioManager.play('step' + step);
      const fog = document.getElementById('mazeFog');
      if (fog) fog.style.opacity = '1';
      MazeRenderer.updatePlayer(player);
      MazeRenderer.updateFog(player);
      MazeRenderer.spawnParticles(player);
      document.getElementById('mazeMoves').textContent = player.moves;

      if (maze[player.y][player.x] === 2) {
        const container = document.getElementById('mazeContainer');
        container.classList.add('maze-next');
        audioManager.play('perfect');
        level++;
        if (level % 2 === 1 && mazeSize < 31) mazeSize += 2;
        setTimeout(() => {
          container.classList.remove('maze-next');
          startLevel();
        }, 250);
      }
    });

    this._stop = function () {
      mazeRunning = false;
      clearInterval(timer); timer = null;
      player = null;
      const result = document.getElementById('mazeResult');
      if (result) result.textContent = '';
      const fog = document.getElementById('mazeFog');
      if (fog) fog.style.opacity = '1';
    };
  },

  stop() { if (this._stop) this._stop(); },
});

})();
