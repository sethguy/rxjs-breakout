import Rx from 'rx';


/* Graphics */

const NUMBER_OF_BALLS = 5;
const BALL_SPEED = 60;

const canvas = document.getElementById('stage');
const context = canvas.getContext('2d');
context.fillStyle = 'pink';

const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 20;

const BALL_RADIUS = 10;

const BRICK_ROWS = 5;
const BRICK_COLUMNS = 7;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 3;

function drawTitle() {
    context.textAlign = 'center';
    context.font = '24px Courier New';
    context.fillText('rxjs breakout', canvas.width / 2, canvas.height / 2 - 24);
}

function drawControls() {
    context.textAlign = 'center';
    context.font = '16px Courier New';
    context.fillText('press [<] and [>] to play', canvas.width / 2, canvas.height / 2);
}

function drawGameOver(text) {
    context.clearRect(canvas.width / 4, canvas.height / 3, canvas.width / 2, canvas.height / 3);
    context.textAlign = 'center';
    context.font = '24px Courier New';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
}

function drawAuthor() {
    context.textAlign = 'center';
    context.font = '16px Courier New';
    context.fillText('by Manuel Wieser', canvas.width / 2, canvas.height / 2 + 24);
}

function drawScore(score) {
    context.textAlign = 'left';
    context.font = '16px Courier New';
    context.fillText(score, BRICK_GAP, 16);
}

function drawPaddle(position) {
    context.beginPath();
    context.rect(
        position - PADDLE_WIDTH / 2,
        context.canvas.height - PADDLE_HEIGHT,
        PADDLE_WIDTH,
        PADDLE_HEIGHT
    );
    context.fill();
    context.closePath();
}

function drawBall(ball) {
    context.beginPath();
    context.arc(ball.position.x, ball.position.y, BALL_RADIUS, 0, Math.PI * 2);
    context.fill();
    context.closePath();
}

var drawBalls = function(balls) {

    balls.forEach((ball) => {

        context.beginPath();
        context.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
        context.fill();
        context.closePath();

    })

}

function drawBrick(brick) {
    context.beginPath();
    context.rect(
        brick.x - brick.width / 2,
        brick.y - brick.height / 2,
        brick.width,
        brick.height
    );
    context.fill();
    context.closePath();
}

function drawBricks(bricks) {
    bricks.forEach((brick) => drawBrick(brick));
}

/* Balls */

var ballsFactory = function() {

    let balls = [];

    for (let j = 0; j < NUMBER_OF_BALLS; j++) {

        var x = Math.random() * canvas.width;

        var y = Math.random() * canvas.height;

        var vectorOptions = [-2, 2];

        var startMx = vectorOptions[Math.floor(Math.random() * vectorOptions.length)];

        var startMy = vectorOptions[Math.floor(Math.random() * vectorOptions.length)];

        balls.push({

            wallCollision:{

                x:false,

                y:false
            },

            speedX: Math.floor(BALL_SPEED * Math.random()) + 3,

            speedY: Math.floor(BALL_SPEED * Math.random()) + 3,

            radius: BALL_RADIUS,
            collisions: [],
            range: {

                x: { start: x - BALL_RADIUS, end: x + BALL_RADIUS },

                y: { start: y - BALL_RADIUS, end: y + BALL_RADIUS }

            },
            position: {

                x: x,

                y: y

            },
            direction: {

                x: startMx,

                y: startMy

            }

        });

    }

    return balls;
}

/* Sounds */

const audio = new(window.AudioContext || window.webkitAudioContext)();
const beeper = new Rx.Subject();
beeper.sample(100).subscribe((key) => {

    let oscillator = audio.createOscillator();
    oscillator.connect(audio.destination);
    oscillator.type = 'square';

    // https://en.wikipedia.org/wiki/Piano_key_frequencies
    oscillator.frequency.value = Math.pow(2, (key - 49) / 12) * 440;

    oscillator.start();
    oscillator.stop(audio.currentTime + 0.100);

});

/* Ticker */

const TICKER_INTERVAL = 17;

const ticker$ = Rx.Observable
    .interval(TICKER_INTERVAL, Rx.Scheduler.requestAnimationFrame)
    .map(() => ({
        time: Date.now(),
        deltaTime: null
    }))
    .scan(
        (previous, current) => ({
            time: current.time,
            deltaTime: (current.time - previous.time) / 1000
        })
    );


/* Paddle */

const PADDLE_SPEED = 240;
const PADDLE_KEYS = {
    left: 37,
    right: 39
};

const input$ = Rx.Observable
    .merge(
        Rx.Observable.fromEvent(document, 'keydown', event => {
            switch (event.keyCode) {
                case PADDLE_KEYS.left:
                    return -1;
                case PADDLE_KEYS.right:
                    return 1;
                default:
                    return 0;
            }
        }),
        Rx.Observable.fromEvent(document, 'keyup', event => 0)
    )
    .distinctUntilChanged();

const paddle$ = ticker$
    .withLatestFrom(input$)
    .scan((position, [ticker, direction]) => {

        let next = position + direction * ticker.deltaTime * PADDLE_SPEED;
        return Math.max(Math.min(next, canvas.width - PADDLE_WIDTH / 2), PADDLE_WIDTH / 2);

    }, canvas.width / 2)
    .distinctUntilChanged();


/* Ball */


const INITIAL_OBJECTS = {
    balls: ballsFactory(),
    score: 0
};


function ballXSortfunction(a, b) {
    if (a.position.x < b.position.x) {
        return -1;
    }
    if (a.position.x > b.position.x) {
        return 1;
    }
    // a must be equal to b
    return 0;
}

function ballYSortfunction(a, b) {
    if (a.position.y < b.position.y) {
        return -1;
    }
    if (a.position.y > b.position.y) {
        return 1;
    }
    // a must be equal to b
    return 0;
}

var collisionScanner = function(balls) {

        var collisionReport = {

        };

        var xCollisions = [];

        var yCollisions = [];

        balls.reduce((ranges, nextBall) => {

                xCollisions = ranges.filter((ball) => (ball.range.x.end > nextBall.range.x.start)).map((ball) => {

                    return ball;

                })

                yCollisions = ranges.filter((ball) => (ball.range.y.end > nextBall.range.y.start)).map((ball) => {

                    return ball;

                }).filter((yball) => {

                    return xCollisions.filter((xball) => (xball.id == yball.id)).length > 0

                }).map((yballAtDoubleCollision) => {

                    nextBall.collisions.push(yballAtDoubleCollision)

                    yballAtDoubleCollision.collisions.push(nextBall)

                    return yballAtDoubleCollision

                })

                ranges.push(nextBall);

                return ranges;

            }, []) // REDUCE

        // console.log('yCollisions', yCollisions)

        var collisions = []

        balls.forEach((ball) => {

                ball.wallCollision.x = false;

                ball.wallCollision.y = false;

            if (ball.position.x < BALL_RADIUS || ball.position.x > canvas.width - BALL_RADIUS) {
                ball.direction.x = -ball.direction.x;
                ball.wallCollision.x = true;
            }

            collisions.ceiling = ball.position.y < BALL_RADIUS;

            collisions.floor = (ball.position.y > canvas.height - BALL_RADIUS)

            if (collisions.ceiling || collisions.floor) {
                ball.direction.y = -ball.direction.y;


                ball.wallCollision.y = true;
            }

        })

        return collisionReport;

    } //collisionScanner

const objects$ = ticker$
    .withLatestFrom(paddle$)
    .scan(({ balls, score }, [ticker, paddle]) => {

        balls.forEach((ball) => {

            ball.position.x = ball.position.x + ball.direction.x * ticker.deltaTime * ball.speedX;

            ball.position.y = ball.position.y + ball.direction.y * ticker.deltaTime * ball.speedY;

        })

        var collisionsReport = collisionScanner(balls);

        return {
            balls: balls,
            score: score
        };

    }, INITIAL_OBJECTS);

/* Game */

drawTitle();
drawControls();
drawAuthor();

function update([ticker, paddle, objects]) {

    context.clearRect(0, 0, canvas.width, canvas.height);

    drawBalls(objects.balls);

    drawScore(objects.score);

    objects.balls.forEach((ball) => {

            if(ball.wallCollision.x || ball.wallCollision.y){

                    beeper.onNext(40);

            }

    })

}

const game = Rx.Observable
    .combineLatest(ticker$, paddle$, objects$)
    .sample(TICKER_INTERVAL)
    .subscribe(update);
