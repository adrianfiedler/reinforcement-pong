import * as tf from '@tensorflow/tfjs';

export class Paddle {
  /**
   * Constructor of CartPole.
   */
  constructor(ball, isAI) {
    // Constants that characterize the system.
    this.ball = ball;
    if(isAI === true) {
      this.x = 450;
      this.speed = 1;
    } else {
      this.x = 50;
      this.speed = 7;
    }
    
    this.isAI = isAI;
    this.height = 16;
    this.width = 8;
    this.screenWidth = 500;
    this.screenHeight = 150;
    this.y = this.screenHeight / 2 - this.height / 2;
  }

  /**
   * Get current state as a tf.Tensor of shape [1, 4].
   */
  getStateTensor () {
    let state = tf.tensor2d([[this.y / this.screenHeight, this.ball.y/this.screenHeight, this.getYDistToBall()]]);
    return state;
  }

  setRandomState () {
    this.y = Math.random() * (this.screenHeight - this.height);
  }

  /**
   * Update the cart-pole system using an action.
   * @param {number} action Only the sign of `action` matters.
   *   A value > 0 leads to upward movement.
   *   A value <= 0 leads to a downward movement.
   */
  update (action) {
    let movement;
    if (this.isAI === true) {
      movement = (this.ball.y > this.y) ? 1 : -1;
      this.y += (movement * this.speed);
      // this.y = this.ball.y;
    } else {
      movement = (action > 0) ? 1 : -1;
      this.y += (movement * this.speed);
    }

    if (this.y < 0) {
      this.y = 0;
    }
    if (this.y > (this.screenHeight - this.height)) {
      this.y = this.screenHeight - this.height;
    }
  }

  getRect () {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    }
  }

  getYDistToBall() {
    const distY = ((this.y + this.height /2.0) - (this.ball.y + this.ball.r / 2.0)) / this.screenHeight; 
    return distY;
  }
}
