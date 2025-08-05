import { jsxDEV } from "react/jsx-dev-runtime";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { WebsimSocket, useQuery } from "@websim/use-query";
const room = new WebsimSocket();
const CHARACTERS = [
  { name: "Rumi", color: "#ff1493", power: "Lightning Strike" },
  { name: "Mira", color: "#00ffff", power: "Ice Crystal" },
  { name: "Zoey", color: "#ff6b35", power: "Fire Blast" }
];
const GAME_DURATION = 60;
const BEAT_INTERVAL = 600;
function GameScreen({ character, onGameEnd, onBack }) {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [demons, setDemons] = useState([]);
  const [beatTargets, setBeatTargets] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [showPerfect, setShowPerfect] = useState(false);
  const gameLoopRef = useRef();
  const backgroundMusicRef = useRef();
  const spellAudioRef = useRef();
  const defeatAudioRef = useRef();
  const animationFrameRef = useRef();
  useEffect(() => {
    const musicTracks = {
      "Rumi": "golden-beat.mp3",
      "Mira": "takedown-beat.mp3",
      "Zoey": "how-its-done-beat.mp3"
    };
    backgroundMusicRef.current = new Audio(musicTracks[character.name]);
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.7;
    spellAudioRef.current = new Audio("spell-cast.mp3");
    defeatAudioRef.current = new Audio("demon-defeat.mp3");
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current.timer);
        clearInterval(gameLoopRef.current.demonSpawner);
        clearInterval(gameLoopRef.current.beatSpawner);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
      }
    };
  }, [character.name]);
  const updateGame = useCallback(() => {
    if (!gameActive) return;
    setBeatTargets((prev) => {
      const now = Date.now();
      return prev.map((beat) => {
        const elapsed = now - beat.spawnTime;
        const progress = elapsed / beat.duration;
        const newY = 20 + progress * 60;
        return { ...beat, y: newY, progress };
      }).filter((beat) => beat.progress < 1.2);
    });
    animationFrameRef.current = requestAnimationFrame(updateGame);
  }, [gameActive]);
  useEffect(() => {
    if (gameActive) {
      animationFrameRef.current = requestAnimationFrame(updateGame);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameActive, updateGame]);
  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setCombo(0);
    setTimeLeft(GAME_DURATION);
    setDemons([]);
    setBeatTargets([]);
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.currentTime = 0;
      backgroundMusicRef.current.play().catch(() => {
      });
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1e3);
    const demonSpawner = setInterval(() => {
      if (Math.random() < 0.3) {
        const newDemon = {
          id: Date.now() + Math.random(),
          x: Math.random() * 80 + 10,
          y: Math.random() * 60 + 20,
          health: 3
        };
        setDemons((prev) => [...prev, newDemon]);
      }
    }, 2e3);
    const beatSpawner = setInterval(() => {
      const newBeat = {
        id: Date.now() + Math.random(),
        x: Math.random() * 90 + 5,
        y: 20,
        spawnTime: Date.now(),
        duration: 2e3,
        // Time to reach hit zone
        progress: 0
      };
      setBeatTargets((prev) => [...prev, newBeat]);
      if (beatAudioRef.current) {
        beatAudioRef.current.currentTime = 0;
        beatAudioRef.current.play().catch(() => {
        });
      }
    }, BEAT_INTERVAL);
    gameLoopRef.current = { timer, demonSpawner, beatSpawner };
  };
  const endGame = async () => {
    setGameActive(false);
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
    }
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current.timer);
      clearInterval(gameLoopRef.current.demonSpawner);
      clearInterval(gameLoopRef.current.beatSpawner);
      gameLoopRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    const currentUser = await window.websim.getCurrentUser();
    await room.collection("game_scores").upsert({
      id: `${currentUser.id}-${Date.now()}`,
      character: character.name,
      score,
      final_combo: combo
    });
    onGameEnd(score);
  };
  const handleBeatClick = (beatId, event) => {
    const beat = beatTargets.find((b) => b.id === beatId);
    if (!beat) return;
    const perfectY = 80;
    const hitDistance = Math.abs(beat.y - perfectY);
    let hitQuality = "miss";
    let points = 0;
    if (hitDistance < 5) {
      hitQuality = "perfect";
      points = 100 + combo * 10;
      setCombo((prev) => prev + 1);
      setShowPerfect(true);
      setTimeout(() => setShowPerfect(false), 500);
    } else if (hitDistance < 10) {
      hitQuality = "good";
      points = 50 + combo * 5;
      setCombo((prev) => prev + 1);
    } else if (hitDistance < 15) {
      hitQuality = "ok";
      points = 25;
      setCombo(0);
    } else {
      setCombo(0);
    }
    if (points > 0) {
      setScore((prev) => prev + points);
      if (spellAudioRef.current) {
        spellAudioRef.current.currentTime = 0;
        spellAudioRef.current.play().catch(() => {
        });
      }
      setDemons((prev) => prev.map((demon) => {
        const distance = Math.sqrt(
          Math.pow(demon.x - beat.x, 2) + Math.pow(demon.y - beat.y, 2)
        );
        if (distance < 25) {
          const newHealth = demon.health - 1;
          if (newHealth <= 0) {
            if (defeatAudioRef.current) {
              defeatAudioRef.current.currentTime = 0;
              defeatAudioRef.current.play().catch(() => {
              });
            }
            setScore((prev2) => prev2 + 200);
            return null;
          }
          return { ...demon, health: newHealth };
        }
        return demon;
      }).filter(Boolean));
    }
    setBeatTargets((prev) => prev.filter((b) => b.id !== beatId));
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "game-screen h-screen relative overflow-hidden", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "game-bg absolute inset-0" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 248,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "absolute left-0 right-0 z-5", style: { top: "80%" }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "h-1 bg-white bg-opacity-50 mx-4" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 252,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "text-center text-white text-sm mt-1", children: "Hit Zone" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 253,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 251,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center", children: [
      /* @__PURE__ */ jsxDEV("button", { onClick: onBack, className: "neon-button text-sm", children: "\u2190 Back" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 258,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "text-white font-bold text-xl", children: [
          "Score: ",
          score.toLocaleString()
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 260,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "text-cyan-300", children: [
          "Combo: ",
          combo,
          "x"
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 261,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 259,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "text-right", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "text-white font-bold text-lg", children: [
          "Time: ",
          timeLeft,
          "s"
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 264,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "text-sm", style: { color: character.color }, children: [
          "Playing as ",
          character.name
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 265,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 263,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 257,
      columnNumber: 13
    }, this),
    showPerfect && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center z-30 pointer-events-none", children: /* @__PURE__ */ jsxDEV("div", { className: "perfect-hit text-6xl font-bold text-yellow-300 drop-shadow-lg animate-pulse", children: "PERFECT!" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 274,
      columnNumber: 21
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 273,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 z-10", children: [
      demons.map((demon) => /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "demon absolute w-12 h-12 rounded-full border-2 border-red-500 animate-pulse",
          style: {
            left: `${demon.x}%`,
            top: `${demon.y}%`,
            backgroundColor: "#ff0066",
            boxShadow: "0 0 20px #ff0066"
          },
          children: /* @__PURE__ */ jsxDEV("div", { className: "w-full h-1 bg-gray-700 mt-12", children: /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "h-full bg-red-500 transition-all duration-200",
              style: { width: `${demon.health / 3 * 100}%` }
            },
            void 0,
            false,
            {
              fileName: "<stdin>",
              lineNumber: 295,
              columnNumber: 29
            },
            this
          ) }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 294,
            columnNumber: 25
          }, this)
        },
        demon.id,
        false,
        {
          fileName: "<stdin>",
          lineNumber: 284,
          columnNumber: 21
        },
        this
      )),
      beatTargets.map((beat) => /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "beat-target absolute w-16 h-16 rounded-full border-4 cursor-pointer",
          style: {
            left: `${beat.x}%`,
            top: `${beat.y}%`,
            borderColor: character.color,
            boxShadow: `0 0 30px ${character.color}`,
            opacity: Math.max(0.3, 1 - beat.progress * 0.5)
          },
          onClick: (e) => handleBeatClick(beat.id, e),
          children: /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "w-full h-full rounded-full",
              style: { backgroundColor: character.color, opacity: 0.3 }
            },
            void 0,
            false,
            {
              fileName: "<stdin>",
              lineNumber: 317,
              columnNumber: 25
            },
            this
          )
        },
        beat.id,
        false,
        {
          fileName: "<stdin>",
          lineNumber: 305,
          columnNumber: 21
        },
        this
      ))
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 281,
      columnNumber: 13
    }, this),
    !gameActive && timeLeft === GAME_DURATION && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40", children: /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxDEV("h2", { className: "text-4xl font-bold text-white mb-4", children: [
        "Ready to hunt demons, ",
        character.name,
        "?"
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 329,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-lg text-gray-300 mb-6", children: [
        "Tap the beat circles when they reach the hit zone to cast ",
        character.power,
        " spells!",
        /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 333,
          columnNumber: 112
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-cyan-300", children: [
          "Now playing: ",
          character.name === "Rumi" ? "Golden" : character.name === "Mira" ? "Takedown" : "How It's Done"
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 334,
          columnNumber: 29
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 332,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("button", { onClick: startGame, className: "neon-button text-2xl px-8 py-4", children: "Start Game" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 336,
        columnNumber: 25
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 328,
      columnNumber: 21
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 327,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 247,
    columnNumber: 9
  }, this);
}
function Leaderboard({ onBack }) {
  const { data: scores, loading } = useQuery(
    room.query(`
            SELECT gs.id, gs.character, gs.score, gs.final_combo, gs.created_at, u.username
            FROM public.game_scores gs
            JOIN public.user u ON gs.user_id = u.id
            ORDER BY gs.score DESC
            LIMIT 20
        `)
  );
  return /* @__PURE__ */ jsxDEV("div", { className: "leaderboard-screen min-h-screen p-6", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-4xl mx-auto", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mb-8", children: [
      /* @__PURE__ */ jsxDEV("button", { onClick: onBack, className: "neon-button", children: "\u2190 Back" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 361,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "text-4xl font-bold text-white", children: "Demon Hunter Leaderboard" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 362,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", {}, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 363,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 360,
      columnNumber: 17
    }, this),
    loading ? /* @__PURE__ */ jsxDEV("div", { className: "text-center text-white text-xl", children: "Loading scores..." }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 367,
      columnNumber: 21
    }, this) : /* @__PURE__ */ jsxDEV("div", { className: "leaderboard-grid", children: scores.map((score, index) => /* @__PURE__ */ jsxDEV("div", { className: "leaderboard-entry p-4 rounded-lg mb-4", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center space-x-4", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "rank-badge", children: [
          "#",
          index + 1
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 374,
          columnNumber: 41
        }, this),
        /* @__PURE__ */ jsxDEV(
          "img",
          {
            src: `https://images.websim.com/avatar/${score.username}`,
            alt: score.username,
            className: "w-12 h-12 rounded-full"
          },
          void 0,
          false,
          {
            fileName: "<stdin>",
            lineNumber: 375,
            columnNumber: 41
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-white font-bold", children: score.username }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 381,
            columnNumber: 45
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-sm", style: {
            color: CHARACTERS.find((c) => c.name === score.character)?.color || "#fff"
          }, children: score.character }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 382,
            columnNumber: 45
          }, this)
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 380,
          columnNumber: 41
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 373,
        columnNumber: 37
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "text-right", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "text-2xl font-bold text-yellow-300", children: score.score.toLocaleString() }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 390,
          columnNumber: 41
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "text-sm text-gray-400", children: [
          "Max Combo: ",
          score.final_combo,
          "x"
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 393,
          columnNumber: 41
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 389,
        columnNumber: 37
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 372,
      columnNumber: 33
    }, this) }, score.id, false, {
      fileName: "<stdin>",
      lineNumber: 371,
      columnNumber: 29
    }, this)) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 369,
      columnNumber: 21
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 359,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "<stdin>",
    lineNumber: 358,
    columnNumber: 9
  }, this);
}
function App() {
  const [screen, setScreen] = useState("menu");
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [lastScore, setLastScore] = useState(0);
  const showCharacterSelect = () => setScreen("characters");
  const showLeaderboard = () => setScreen("leaderboard");
  const showMenu = () => setScreen("menu");
  const startGame = (character) => {
    setSelectedCharacter(character);
    setScreen("game");
  };
  const handleGameEnd = (score) => {
    setLastScore(score);
    setScreen("gameOver");
  };
  if (screen === "characters") {
    return /* @__PURE__ */ jsxDEV("div", { className: "character-select min-h-screen flex items-center justify-center p-6", children: /* @__PURE__ */ jsxDEV("div", { className: "text-center max-w-4xl", children: [
      /* @__PURE__ */ jsxDEV("button", { onClick: showMenu, className: "absolute top-4 left-4 neon-button", children: "\u2190 Back" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 430,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "text-5xl font-bold text-white mb-4", children: "Choose Your Hunter" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 432,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-gray-300 mb-12", children: "Select a member of HUNTR/X to defend Seoul!" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 433,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8", children: CHARACTERS.map((character) => /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "character-card p-6 rounded-lg cursor-pointer transform hover:scale-105 transition-all duration-300",
          onClick: () => startGame(character),
          children: [
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "character-avatar w-32 h-32 mx-auto mb-4 rounded-full",
                style: { backgroundColor: character.color, boxShadow: `0 0 30px ${character.color}` },
                children: /* @__PURE__ */ jsxDEV("div", { className: "w-full h-full flex items-center justify-center text-4xl font-bold text-white", children: character.name[0] }, void 0, false, {
                  fileName: "<stdin>",
                  lineNumber: 441,
                  columnNumber: 37
                }, this)
              },
              void 0,
              false,
              {
                fileName: "<stdin>",
                lineNumber: 439,
                columnNumber: 33
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("h3", { className: "text-2xl font-bold text-white mb-2", children: character.name }, void 0, false, {
              fileName: "<stdin>",
              lineNumber: 445,
              columnNumber: 33
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-lg", style: { color: character.color }, children: character.power }, void 0, false, {
              fileName: "<stdin>",
              lineNumber: 446,
              columnNumber: 33
            }, this)
          ]
        },
        character.name,
        true,
        {
          fileName: "<stdin>",
          lineNumber: 437,
          columnNumber: 29
        },
        this
      )) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 435,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 429,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 428,
      columnNumber: 13
    }, this);
  }
  if (screen === "game") {
    return /* @__PURE__ */ jsxDEV(
      GameScreen,
      {
        character: selectedCharacter,
        onGameEnd: handleGameEnd,
        onBack: showCharacterSelect
      },
      void 0,
      false,
      {
        fileName: "<stdin>",
        lineNumber: 457,
        columnNumber: 13
      },
      this
    );
  }
  if (screen === "gameOver") {
    return /* @__PURE__ */ jsxDEV("div", { className: "game-over min-h-screen flex items-center justify-center p-6", children: /* @__PURE__ */ jsxDEV("div", { className: "text-center max-w-2xl", children: [
      /* @__PURE__ */ jsxDEV("h1", { className: "text-6xl font-bold text-white mb-4", children: "Mission Complete!" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 469,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "text-4xl font-bold text-yellow-300 mb-6", children: [
        "Final Score: ",
        lastScore.toLocaleString()
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 470,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-gray-300 mb-8", children: [
        "Seoul is safe for another day, thanks to ",
        selectedCharacter.name,
        "!"
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 473,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-x-4", children: [
        /* @__PURE__ */ jsxDEV("button", { onClick: showCharacterSelect, className: "neon-button text-xl px-6 py-3", children: "Play Again" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 477,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("button", { onClick: showLeaderboard, className: "neon-button text-xl px-6 py-3", children: "View Leaderboard" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 480,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("button", { onClick: showMenu, className: "neon-button text-xl px-6 py-3", children: "Main Menu" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 483,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 476,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 468,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 467,
      columnNumber: 13
    }, this);
  }
  if (screen === "leaderboard") {
    return /* @__PURE__ */ jsxDEV(Leaderboard, { onBack: showMenu }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 493,
      columnNumber: 16
    }, this);
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "menu-screen min-h-screen flex items-center justify-center p-6", children: /* @__PURE__ */ jsxDEV("div", { className: "text-center max-w-4xl", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "logo-section mb-12", children: [
      /* @__PURE__ */ jsxDEV("h1", { className: "text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-500 to-orange-500 mb-4", children: "KPOP DEMON HUNTERS" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 500,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold text-white mb-2", children: "Rhythm Challenge" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 503,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-gray-300", children: "Join HUNTR/X in defending Seoul with the power of music!" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 504,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 499,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxDEV("button", { onClick: showCharacterSelect, className: "neon-button text-2xl px-8 py-4 w-full max-w-md", children: "Start Game" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 510,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("button", { onClick: showLeaderboard, className: "neon-button text-2xl px-8 py-4 w-full max-w-md", children: "Leaderboard" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 513,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 509,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "mt-12 text-gray-400", children: [
      /* @__PURE__ */ jsxDEV("p", { className: "mb-4", children: "How to Play:" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 519,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "text-left max-w-2xl mx-auto space-y-2", children: [
        /* @__PURE__ */ jsxDEV("p", { children: "\u2022 Choose your HUNTR/X member: Rumi, Mira, or Zoey" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 521,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "\u2022 Tap beat circles in rhythm to cast spells" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 522,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "\u2022 Perfect timing builds combo multipliers" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 523,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "\u2022 Defeat demons to protect Seoul and earn points" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 524,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "\u2022 Compete for the highest score on the leaderboard!" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 525,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 520,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 518,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 498,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "<stdin>",
    lineNumber: 497,
    columnNumber: 9
  }, this);
}
const root = createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
  fileName: "<stdin>",
  lineNumber: 534,
  columnNumber: 13
}));
