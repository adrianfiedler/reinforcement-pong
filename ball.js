export class Ball {
  constructor() {
    this.RIGHT_BOUND = 400;
    this.x = this.RIGHT_BOUND / 2.0;
    this.y = this.LOWER_BOUND / 2.0;
    this.speed = 10;
    this.r = 3;
    this.velocity = {
      x: 1.0,
      y: 0.0
    };
  }

  update (leftPaddle, rightPaddle) {
    if (this.intersect(leftPaddle.getRect()) || this.intersect(rightPaddle.getRect())) {
      this.velocity.x *= -1;
    }
    this.x += this.velocity.x * this.speed;
    this.y += this.velocity.y * this.speed;
    return this.isDone();
  }

  /**
   * Determine whether this simulation is done.
   *
   * A simulation is done when the ball goes out of left or right bound
   *
   * @returns {bool} Whether the simulation is done.
   */
  isDone () {
    return this.ball.x < 0 || this.ball.x > this.RIGHT_BOUND;
  }

  getRect () {
    return {
      x: this.x,
      y: this.y,
      width: 3,
      height: 3
    }
  }

  intersect (rect) {
    return !(rect.x > (this.x + r) ||
      rect.x + rect.width < this.x ||
      rect.y > this.y + this.r ||
      (rect.y + rect.height) < this.y);
  }

  setRandomState () {
    
  }
}
