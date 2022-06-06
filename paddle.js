import * as tf from '@tensorflow/tfjs';

export class Paddle {
  /**
   * Constructor of CartPole.
   */
  constructor(ball, isAI) {
    // Constants that characterize the system.
    this.y = 200;
    this.ball = ball;
    this.speed = 10;
    this.isAI = isAI;
  }

  /**
   * Get current state as a tf.Tensor of shape [1, 4].
   */
  getStateTensor () {
    return tf.tensor2d([[this.y, this.ball.x, this.ball.y, this.ball.velocity.x, this.ball.velocity.y]]);
  }

  setRandomState () {
    this.y = 200;
  }

  /**
   * Update the cart-pole system using an action.
   * @param {number} action Only the sign of `action` matters.
   *   A value > 0 leads to upward movement.
   *   A value <= 0 leads to a downward movement.
   */
  update (action) {
    let movement;
    if (this.isAI) {
      movement = this.ball.y > this.y ? 1 : -1;
    } else {
      movement = action > 0 ? 1 : -1;
    }
    this.y += movement * this.speed;
  }
}
