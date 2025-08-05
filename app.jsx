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
  const beatAudioRef = useRef();
  const spellAudioRef = useRef();
  const defeatAudioRef = useRef();
  useEffect(() => {
    beatAudioRef.current = new Audio("beat-sound.mp3");
    spellAudioRef.current = new Audio("spell-cast.mp3");
    defeatAudioRef.current = new Audio("demon-defeat.mp3");
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, []);
  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setCombo(0);
    setTimeLeft(GAME_DURATION);
    setDemons([]);
    setBeatTargets([]);
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
          id: Date.now(),
          x: Math.random() * 80 + 10,
          y: Math.random() * 60 + 20,
          health: 3
        };
        setDemons((prev) => [...prev, newDemon]);
      }
    }, 2e3);
    const beatSpawner = setInterval(() => {
      const newBeat = {
        id: Date.now(),
        x: Math.random() * 90 + 5,
        timing: Date.now() + 2e3
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
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current.timer);
      clearInterval(gameLoopRef.current.demonSpawner);
      clearInterval(gameLoopRef.current.beatSpawner);
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
    const now = Date.now();
    const timeDiff = Math.abs(now - beat.timing);
    let hitQuality = "miss";
    let points = 0;
    if (timeDiff < 100) {
      hitQuality = "perfect";
      points = 100 + combo * 10;
      setCombo((prev) => prev + 1);
      setShowPerfect(true);
      setTimeout(() => setShowPerfect(false), 500);
    } else if (timeDiff < 200) {
      hitQuality = "good";
      points = 50 + combo * 5;
      setCombo((prev) => prev + 1);
    } else if (timeDiff < 300) {
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
          Math.pow(demon.x - event.clientX / window.innerWidth * 100, 2) + Math.pow(demon.y - event.clientY / window.innerHeight * 100, 2)
        );
        if (distance < 20) {
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
      lineNumber: 178,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center", children: [
      /* @__PURE__ */ jsxDEV("button", { onClick: onBack, className: "neon-button text-sm", children: "\u2190 Back" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 182,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "text-white font-bold text-xl", children: [
          "Score: ",
          score.toLocaleString()
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 184,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "text-cyan-300", children: [
          "Combo: ",
          combo,
          "x"
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 185,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 183,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "text-right", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "text-white font-bold text-lg", children: [
          "Time: ",
          timeLeft,
          "s"
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 188,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "text-sm", style: { color: character.color }, children: [
          "Playing as ",
          character.name
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 189,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 187,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 181,
      columnNumber: 13
    }, this),
    showPerfect && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center z-30 pointer-events-none", children: /* @__PURE__ */ jsxDEV("div", { className: "perfect-hit text-6xl font-bold text-yellow-300 drop-shadow-lg animate-pulse", children: "PERFECT!" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 198,
      columnNumber: 21
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 197,
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
              lineNumber: 219,
              columnNumber: 29
            },
            this
          ) }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 218,
            columnNumber: 25
          }, this)
        },
        demon.id,
        false,
        {
          fileName: "<stdin>",
          lineNumber: 208,
          columnNumber: 21
        },
        this
      )),
      beatTargets.map((beat) => /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "beat-target absolute w-16 h-16 rounded-full border-4 cursor-pointer animate-ping",
          style: {
            left: `${beat.x}%`,
            top: "80%",
            borderColor: character.color,
            boxShadow: `0 0 30px ${character.color}`
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
              lineNumber: 240,
              columnNumber: 25
            },
            this
          )
        },
        beat.id,
        false,
        {
          fileName: "<stdin>",
          lineNumber: 229,
          columnNumber: 21
        },
        this
      ))
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 205,
      columnNumber: 13
    }, this),
    !gameActive && timeLeft === GAME_DURATION && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40", children: /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxDEV("h2", { className: "text-4xl font-bold text-white mb-4", children: [
        "Ready to hunt demons, ",
        character.name,
        "?"
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 252,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-lg text-gray-300 mb-6", children: [
        "Tap the beat circles in rhythm to cast ",
        character.power,
        " spells!"
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 255,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("button", { onClick: startGame, className: "neon-button text-2xl px-8 py-4", children: "Start Game" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 258,
        columnNumber: 25
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 251,
      columnNumber: 21
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 250,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 177,
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
        lineNumber: 283,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "text-4xl font-bold text-white", children: "Demon Hunter Leaderboard" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 284,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", {}, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 285,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 282,
      columnNumber: 17
    }, this),
    loading ? /* @__PURE__ */ jsxDEV("div", { className: "text-center text-white text-xl", children: "Loading scores..." }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 289,
      columnNumber: 21
    }, this) : /* @__PURE__ */ jsxDEV("div", { className: "leaderboard-grid", children: scores.map((score, index) => /* @__PURE__ */ jsxDEV("div", { className: "leaderboard-entry p-4 rounded-lg mb-4", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center space-x-4", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "rank-badge", children: [
          "#",
          index + 1
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 296,
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
            lineNumber: 297,
            columnNumber: 41
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-white font-bold", children: score.username }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 303,
            columnNumber: 45
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-sm", style: {
            color: CHARACTERS.find((c) => c.name === score.character)?.color || "#fff"
          }, children: score.character }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 304,
            columnNumber: 45
          }, this)
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 302,
          columnNumber: 41
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 295,
        columnNumber: 37
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "text-right", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "text-2xl font-bold text-yellow-300", children: score.score.toLocaleString() }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 312,
          columnNumber: 41
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "text-sm text-gray-400", children: [
          "Max Combo: ",
          score.final_combo,
          "x"
        ] }, void 0, true, {
          fileName: "<stdin>",
          lineNumber: 315,
          columnNumber: 41
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 311,
        columnNumber: 37
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 294,
      columnNumber: 33
    }, this) }, score.id, false, {
      fileName: "<stdin>",
      lineNumber: 293,
      columnNumber: 29
    }, this)) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 291,
      columnNumber: 21
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 281,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "<stdin>",
    lineNumber: 280,
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
        lineNumber: 352,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "text-5xl font-bold text-white mb-4", children: "Choose Your Hunter" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 354,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-gray-300 mb-12", children: "Select a member of HUNTR/X to defend Seoul!" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 355,
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
                  lineNumber: 363,
                  columnNumber: 37
                }, this)
              },
              void 0,
              false,
              {
                fileName: "<stdin>",
                lineNumber: 361,
                columnNumber: 33
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("h3", { className: "text-2xl font-bold text-white mb-2", children: character.name }, void 0, false, {
              fileName: "<stdin>",
              lineNumber: 367,
              columnNumber: 33
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-lg", style: { color: character.color }, children: character.power }, void 0, false, {
              fileName: "<stdin>",
              lineNumber: 368,
              columnNumber: 33
            }, this)
          ]
        },
        character.name,
        true,
        {
          fileName: "<stdin>",
          lineNumber: 359,
          columnNumber: 29
        },
        this
      )) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 357,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 351,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 350,
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
        lineNumber: 379,
        columnNumber: 13
      },
      this
    );
  }
  if (screen === "gameOver") {
    return /* @__PURE__ */ jsxDEV("div", { className: "game-over min-h-screen flex items-center justify-center p-6", children: /* @__PURE__ */ jsxDEV("div", { className: "text-center max-w-2xl", children: [
      /* @__PURE__ */ jsxDEV("h1", { className: "text-6xl font-bold text-white mb-4", children: "Mission Complete!" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 391,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "text-4xl font-bold text-yellow-300 mb-6", children: [
        "Final Score: ",
        lastScore.toLocaleString()
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 392,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-gray-300 mb-8", children: [
        "Seoul is safe for another day, thanks to ",
        selectedCharacter.name,
        "!"
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 395,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-x-4", children: [
        /* @__PURE__ */ jsxDEV("button", { onClick: showCharacterSelect, className: "neon-button text-xl px-6 py-3", children: "Play Again" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 399,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("button", { onClick: showLeaderboard, className: "neon-button text-xl px-6 py-3", children: "View Leaderboard" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 402,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("button", { onClick: showMenu, className: "neon-button text-xl px-6 py-3", children: "Main Menu" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 405,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 398,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 390,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 389,
      columnNumber: 13
    }, this);
  }
  if (screen === "leaderboard") {
    return /* @__PURE__ */ jsxDEV(Leaderboard, { onBack: showMenu }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 415,
      columnNumber: 16
    }, this);
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "menu-screen min-h-screen flex items-center justify-center p-6", children: /* @__PURE__ */ jsxDEV("div", { className: "text-center max-w-4xl", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "logo-section mb-12", children: [
      /* @__PURE__ */ jsxDEV("h1", { className: "text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-500 to-orange-500 mb-4", children: "KPOP DEMON HUNTERS" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 422,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold text-white mb-2", children: "Rhythm Challenge" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 425,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-gray-300", children: "Join HUNTR/X in defending Seoul with the power of music!" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 426,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 421,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxDEV("button", { onClick: showCharacterSelect, className: "neon-button text-2xl px-8 py-4 w-full max-w-md", children: "Start Game" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 432,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("button", { onClick: showLeaderboard, className: "neon-button text-2xl px-8 py-4 w-full max-w-md", children: "Leaderboard" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 435,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 431,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "mt-12 text-gray-400", children: [
      /* @__PURE__ */ jsxDEV("p", { className: "mb-4", children: "How to Play:" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 441,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "text-left max-w-2xl mx-auto space-y-2", children: [
        /* @__PURE__ */ jsxDEV("p", { children: "\u2022 Choose your HUNTR/X member: Rumi, Mira, or Zoey" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 443,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "\u2022 Tap beat circles in rhythm to cast spells" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 444,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "\u2022 Perfect timing builds combo multipliers" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 445,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "\u2022 Defeat demons to protect Seoul and earn points" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 446,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "\u2022 Compete for the highest score on the leaderboard!" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 447,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 442,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 440,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 420,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "<stdin>",
    lineNumber: 419,
    columnNumber: 9
  }, this);
}
const root = createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
  fileName: "<stdin>",
  lineNumber: 456,
  columnNumber: 13
}));
