import "./style.css";
import { fromEvent, interval, merge } from "rxjs";
import { map, filter, scan } from "rxjs/operators";


function main() {
  /**
   * Inside this function you will use the classes and functions from rx.js
   * to add visuals to the svg element in pong.html, animate them, and make them interactive.
   *
   * Study and complete the tasks in observable examples first to get ideas.
   *
   * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
   *
   * You will be marked on your functional programming style
   * as well as the functionality that you implement.
   *
   * Document your code!
   */

  /**
   * This is the view for your game to add and update your game elements.
   */
  const svg = document.querySelector("#svgCanvas") as SVGElement & HTMLElement;

  // interfaces and types declaration
  interface IBody {
    id: string,
    x: number,
    y: number,
    velocity: number,
    colour: string,
    width: number,
    height: number
  }

  type body = Readonly<IBody>

  type gameState = Readonly<{
    frog: body,
    cars: body[],
    planks: body[],
    targets: body[],
    fly: body, 
    snakeTails: body[],
    snakeHeads: body[],
    collidedTargets: body[],
    gameOver: boolean
    score: number,
  }>

  // return initial frog body
  function createFrog(): body {
    return {
      id: "frog",
      x: 300,
      y: 575,
      velocity: 0,
      colour: "limegreen",
      width: 15,
      height: 15
    }
  }

  // classes for objects in the stream
  class Move {constructor(public readonly x:number, public readonly y:number) {} }
  class Tick {}

  // intialize the initial state
  const
    cars = <body[]> [{id: "car1", x: 0, y: 305, velocity: 1.5, colour: "hotpink", width: 100, height: 40},
                     {id: "car2", x: 300, y: 305, velocity: 1.5, colour: "mistyrose", width: 100, height: 40},
                     {id: "car3", x: 100, y: 355, velocity: 2, colour: "darkcyan", width: 100, height: 40},
                     {id: "car4", x: 400, y: 355, velocity: 2, colour: "aquamarine", width: 100, height: 40},
                     {id: "car5", x: 100, y: 455, velocity: -2, colour: "mediumpurple", width: 100, height: 40},
                     {id: "car6", x: 400, y: 455, velocity: -2, colour: "purple", width: 100, height: 40},
                     {id: "car7", x: 0, y: 505, velocity: -1, colour: "lightgreen", width: 100, height: 40},
                     {id: "car8", x: 300, y: 505, velocity: -1, colour: "seagreen", width: 100, height: 40}],
    
    planks = <body[]> [{id: "plank1", x: -150, y: 205, velocity: 1, colour: "sienna", width: 100, height: 40},
                       {id: "plank2", x: 50, y: 205, velocity: 1, colour: "sienna", width: 150, height: 40},
                       {id: "plank3", x: 350, y: 205, velocity: 1, colour: "sienna", width: 150, height: 40},
                       {id: "plank4", x: -50, y: 155, velocity: 1.3, colour: "sienna", width: 100, height: 40},
                       {id: "plank5", x: 150, y: 155, velocity: 1.3, colour: "sienna", width: 200, height: 40},
                       {id: "plank6", x: 500, y: 155, velocity: 1.3, colour: "sienna", width: 100, height: 40},
                       {id: "plank7", x: -150, y: 105, velocity: 1.6, colour: "sienna", width: 100, height: 40},
                       {id: "plank8", x: 50, y: 105, velocity: 1.6, colour: "sienna", width: 150, height: 40},
                       {id: "plank9", x: 350, y: 105, velocity: 1.6, colour: "sienna", width: 150, height: 40}],
    
    targets = <body[]> [{id: "target1", x: 100, y: 25, velocity: 0, colour: "teal", width: 22, height: 22},
                        {id: "target2", x: 200, y: 25, velocity: 0, colour: "teal", width: 22, height: 22},
                        {id: "target3", x: 300, y: 25, velocity: 0, colour: "teal", width: 22, height: 22},
                        {id: "target4", x: 400, y: 25, velocity: 0, colour: "teal", width: 22, height: 22},
                        {id: "target5", x: 500, y: 25, velocity: 0, colour: "teal", width: 22, height: 22}],
    
    snakeTails = <body[]> [{id: "snakeTail1", x: -50, y: 60, velocity: -2, colour: "darkgreen", width: 100, height: 30},
                           {id: "snakeTail2", x: 200, y: 60, velocity: -2, colour: "darkgreen", width: 100, height: 30},
                           {id: "snakeTail3", x: 450, y: 60, velocity: -2, colour: "darkgreen", width: 150, height: 30}],

    snakeHeads = <body[]> [{id: "snakeHead1", x: -80, y: 60, velocity: -2, colour: "indianred", width: 30, height: 30},
                           {id: "snakeHead2", x: 180, y: 60, velocity: -2, colour: "indianred", width: 30, height: 30},
                           {id: "snakeHead3", x: 420, y: 60, velocity: -2, colour: "indianred", width: 30, height: 30}],
    
                    
    initialState = <gameState> {
      frog: createFrog(),
      cars: cars,
      planks: planks,
      targets: targets,
      fly: {id: "fly", x: (Math.floor(Math.random() * 12))*50 + 20, y: (Math.floor(Math.random() * 5))*50 + 320, velocity: 0, colour: "black", width: 10, height: 10},
      snakeTails: snakeTails,
      snakeHeads: snakeHeads,
      collidedTargets: [],
      gameOver: false,
      score: 0
    },

    // declaring stream
    key$ = fromEvent<KeyboardEvent>(document, "keydown"),
    moveUp$ = key$.pipe(filter(event => event.key == "w"), map(_ => new Move(0, -50))),
    moveLeft$ = key$.pipe(filter(event => event.key == "a"), map(_ => new Move(-30, 0))), 
    moveDown$ = key$.pipe(filter(event => event.key == "s"), map(_ => new Move(0, 50))),
    moveRight$ = key$.pipe(filter(event => event.key == "d"), map(_ => new Move(30, 0))),
    time$ = interval(10).pipe(map(_ => new Tick()))

  // Adapted from FRP Asteroids
  // controller 
  function reduceState(currentState: gameState, e: Move|Tick): gameState {
    return e instanceof Move ? {
        ...currentState,
        frog: <body> {
          ...currentState.frog,
          x: currentState.frog.x + e.x,
          y: currentState.frog.y + e.y
        }
    } : tick(currentState)
  }

  // function to tick the state of the game
  function tick(currentState: gameState): gameState {
    // function to update x position of car
    function moveCar(car: body): body {
      return {
        ...car,
        x: car.x > 600 ? -100 : (car.x < -100 ? 600 : car.x + car.velocity)
      }
    } 

    // function to update x position of plank or snake
    function moveWaterObject(waterObject: body): body {
      return {
        ...waterObject,
        x: waterObject.x > 600 ? -200 : (waterObject.x < -200 ? 600 : waterObject.x + waterObject.velocity)
      }
    } 

    return handleCollison({
      ...currentState,
      cars: currentState.cars.map(moveCar), // returns a new array of cars with new bodies 
      planks: currentState.planks.map(moveWaterObject), // returns a new array of planks with new bodies 
      snakeTails: currentState.snakeTails.map(moveWaterObject), // returns a new array of snakeTails with new bodies 
      snakeHeads: currentState.snakeHeads.map(moveWaterObject) // returns a new array of snakeHeads with new bodies 
    })
  }

  // Adapted from FRP Asteroids
  // function to handle collisions in the state of the game
  function handleCollison(currentState: gameState): gameState {
    const 
      // function to check collision between frog and rectangles
      rectCollided = ([a,b]:[body,body]) => {
        return (a.x + a.width) > b.x && (a.x - a.width) < (b.x + b.width) && (a.y + a.height) > b.y && (a.y - a.height) < (b.y + b.height);
      },

      // function to check collision between frog and circles
      circleCollided = ([a,b]:[body,body]) => {
        return a.x > (b.x - b.width) && a.x < (b.x + b.width) && a.y > (b.y - b.height) && a.y < (b.y + b.height);
      },

      carCollided = currentState.cars.filter(car => rectCollided([currentState.frog, car])),
      plankCollided = currentState.planks.filter(plank => rectCollided([currentState.frog, plank])),
      targetCollided = currentState.targets.filter(target => circleCollided([currentState.frog, target])).map(t => {return {...t, colour: "skyblue"}}),
      flyCollided = rectCollided([currentState.frog, currentState.fly]),
      snakeTailCollided = currentState.snakeTails.filter(snakeTail => rectCollided([currentState.frog, snakeTail])),
      snakeHeadCollided = currentState.snakeHeads.filter(snakeHead => rectCollided([currentState.frog, snakeHead])),
      inRiver = plankCollided.length == 0 && snakeTailCollided.length == 0 && targetCollided.length == 0 && currentState.frog.y < 250 
  
    return {
      ...currentState,
      frog: targetCollided.length > 0 ? createFrog() : 
                                        {...currentState.frog, x: plankCollided.length > 0 ? (plankCollided[0].velocity + currentState.frog.x) : (snakeTailCollided.length > 0 ? snakeTailCollided[0].velocity + currentState.frog.x : currentState.frog.x)},
      targets: currentState.targets.filter(target => !circleCollided([currentState.frog, target])),
      collidedTargets: currentState.collidedTargets.concat(targetCollided),
      fly: flyCollided ? {...currentState.fly, x: (Math.floor(Math.random() * 12))*50 + 20, y: (Math.floor(Math.random() * 5))*50 + 320} : currentState.fly,
      gameOver: carCollided.length > 0 || inRiver || snakeHeadCollided.length > 0,
      score: targetCollided.length > 0 ? currentState.score + 100 : (flyCollided ? currentState.score + 50 : currentState.score)
    }
  }

  // Adapted from FRP Asteroids
  function updateView(currentState: gameState) {
    // function to update the attributes of rectangle objects in the game
    const 
      updateRectView = (body: body) => {
        // function to create rectangle view if not created yet
        function createRectView(): Element {
          const rect = document.createElementNS(svg.namespaceURI, "rect")
          rect.setAttribute("id", body.id)
          rect.setAttribute("x", String(body.x))
          rect.setAttribute("y", String(body.y))
          rect.setAttribute("width", String(body.width))
          rect.setAttribute("height", String(body.height))
          rect.setAttribute("style", "fill: " + body.colour)
          svg.appendChild(rect)
          return rect
        }

        const b = document.getElementById(body.id) || createRectView()
        b.setAttribute("x", String(body.x))
        b.setAttribute("y", String(body.y))
        b.setAttribute("style", "fill: " + body.colour)
      },

      // function to update the attributes of circle objects in the game
      updateCircleView = (body: body) => {
        // function to create circle view if not created yet
        function createCircleView(): Element {
          const circle = document.createElementNS(svg.namespaceURI, "circle")
          circle.setAttribute("id", body.id)
          circle.setAttribute("cx", String(body.x))
          circle.setAttribute("cy", String(body.y))
          circle.setAttribute("r", String(body.width))
          circle.setAttribute("style", "fill: " + body.colour)
          svg.appendChild(circle)
          return circle
        }

        const b = document.getElementById(body.id) || createCircleView()
        b.setAttribute("cx", String(body.x))
        b.setAttribute("cy", String(body.y))
        b.setAttribute("style", "fill: " + body.colour)
      }

    // update fly position 
    updateRectView(currentState.fly)

    // update cars positions
    currentState.cars.forEach(updateRectView)

    // update planks positions
    currentState.planks.forEach(updateRectView)

    // update targets positions
    currentState.targets.forEach(updateCircleView)
    currentState.collidedTargets.forEach(updateCircleView)

    // update snake tails positions
    currentState.snakeTails.forEach(updateRectView)

    // update snake heads positions
    currentState.snakeHeads.forEach(updateRectView)

    // update score 
    const score = document.getElementById("score")!
    score.innerHTML = "Score: " + String(currentState.score);

    // update frog position 
    updateCircleView(currentState.frog)

    // game over
    if (currentState.gameOver) { 
      subscription$.unsubscribe()
      const v = document.createElementNS(svg.namespaceURI, "text")
      v.setAttribute("x", "300")
      v.setAttribute("y", "200")
      v.textContent = "Game Over"
      svg.appendChild(v)
    }
  }
    
  // MAIN SUBSCRIPTION OF THE GAME
  const subscription$ = merge(moveUp$, moveLeft$, moveDown$, moveRight$, time$).pipe(scan(reduceState, initialState)).subscribe(updateView)
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
