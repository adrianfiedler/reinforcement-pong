/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as tf from '@tensorflow/tfjs';
import * as tfvis from '@tensorflow/tfjs-vis';
import embed from 'vega-embed';
import { Ball } from './ball';

import { Paddle } from './paddle';
import { SaveablePolicyNetwork } from './index';
import { mean, sum } from './utils';

const appStatus = document.getElementById('app-status');
const storedModelStatusInput = document.getElementById('stored-model-status');
const hiddenLayerSizesInput = document.getElementById('hidden-layer-sizes');
const createModelButton = document.getElementById('create-model');
const deleteStoredModelButton = document.getElementById('delete-stored-model');
const cartPoleCanvas = document.getElementById('cart-pole-canvas');

const numIterationsInput = document.getElementById('num-iterations');
const gamesPerIterationInput = document.getElementById('games-per-iteration');
const discountRateInput = document.getElementById('discount-rate');
const maxStepsPerGameInput = document.getElementById('max-steps-per-game');
const learningRateInput = document.getElementById('learning-rate');
const renderDuringTrainingCheckbox =
  document.getElementById('render-during-training');

const trainButton = document.getElementById('train');
const testButton = document.getElementById('test');
const iterationStatus = document.getElementById('iteration-status');
const iterationProgress = document.getElementById('iteration-progress');
const trainStatus = document.getElementById('train-status');
const trainSpeed = document.getElementById('train-speed');
const trainProgress = document.getElementById('train-progress');

const stepsContainer = document.getElementById('steps-container');

// Module-global instance of policy network.
let policyNet;
let stopRequested = false;

/**
 * Display a message to the info div.
 *
 * @param {string} message The message to be displayed.
 */
function logStatus (message) {
  appStatus.textContent = message;
  console.log(message);
}

// Objects and functions to support display of cart pole status during training.
let renderDuringTraining = true;
export async function maybeRenderDuringTraining (leftPaddle, rightPaddle, ball) {
  if (renderDuringTraining) {
    renderCartPole(leftPaddle, rightPaddle, ball, cartPoleCanvas);
    await tf.nextFrame();  // Unblock UI thread.
  }
}

/**
 * A function invoked at the end of every game during training.
 *
 * @param {number} gameCount A count of how many games has completed so far in
 *   the current iteration of training.
 * @param {number} totalGames Total number of games to complete in the current
 *   iteration of training.
 */
export function onGameEnd (gameCount, totalGames) {
  iterationStatus.textContent = `Game ${gameCount} of ${totalGames}`;
  iterationProgress.value = gameCount / totalGames * 100;
  if (gameCount === totalGames) {
    iterationStatus.textContent = 'Updating weights...';
  }
}

/**
 * A function invokved at the end of a training iteration.
 *
 * @param {number} iterationCount A count of how many iterations has completed
 *   so far in the current round of training.
 * @param {*} totalIterations Total number of iterations to complete in the
 *   current round of training.
 */
function onIterationEnd (iterationCount, totalIterations) {
  trainStatus.textContent = `Iteration ${iterationCount} of ${totalIterations}`;
  trainProgress.value = iterationCount / totalIterations * 100;
}

// Objects and function to support the plotting of game steps during training.
let meanStepValues = [];
function plotSteps () {
  tfvis.render.linechart(stepsContainer, { values: meanStepValues }, {
    xLabel: 'Training Iteration',
    yLabel: 'Mean Steps Per Game',
    width: 400,
    height: 300,
  });
}

function disableModelControls () {
  trainButton.textContent = 'Stop';
  testButton.disabled = true;
  deleteStoredModelButton.disabled = true;
}

function enableModelControls () {
  trainButton.textContent = 'Train';
  testButton.disabled = false;
  deleteStoredModelButton.disabled = false;
}

/**
 * Render the current state of the system on an HTML canvas.
 *
 * @param {CartPole} cartPole The instance of cart-pole system to render.
 * @param {HTMLCanvasElement} canvas The instance of HTMLCanvasElement on which
 *   the rendering will happen.
 */
function renderCartPole (leftPaddle, rightPaddle, ball, canvas) {
  if (!canvas.style.display) {
    canvas.style.display = 'block';
  }
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw left paddle.
  context.beginPath();
  context.strokeStyle = '#000000';
  context.lineWidth = 2;
  context.rect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
  context.stroke();

  // Draw right paddle.
  context.beginPath();
  context.strokeStyle = '#000000';
  context.lineWidth = 2;
  context.rect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);
  context.stroke();

  // Draw ball.
  context.beginPath();
  // context.arc(ball.x + ball.radius, ball.y + ball.radius, ball.radius, 0, 2 * Math.PI, false);
  context.rect(ball.x, ball.y, ball.r, ball.r);
  context.lineWidth = 2;
  context.strokeStyle = '#000000';
  context.stroke();
}

async function updateUIControlState () {
  const modelInfo = await SaveablePolicyNetwork.checkStoredModelStatus();
  if (modelInfo == null) {
    storedModelStatusInput.value = 'No stored model.';
    deleteStoredModelButton.disabled = true;

  } else {
    storedModelStatusInput.value = `Saved@${modelInfo.dateSaved.toISOString()}`;
    deleteStoredModelButton.disabled = false;
    createModelButton.disabled = true;
  }
  createModelButton.disabled = policyNet != null;
  hiddenLayerSizesInput.disabled = policyNet != null;
  trainButton.disabled = policyNet == null;
  testButton.disabled = policyNet == null;
  renderDuringTrainingCheckbox.checked = renderDuringTraining;
}

export async function setUpUI () {
  const ball = new Ball();
  const leftPaddle = new Paddle(ball, false);
  const rightPaddle = new Paddle(ball, true);

  if (await SaveablePolicyNetwork.checkStoredModelStatus() != null) {
    policyNet = await SaveablePolicyNetwork.loadModel();
    logStatus('Loaded policy network from IndexedDB.');
    hiddenLayerSizesInput.value = policyNet.hiddenLayerSizes();
  }
  await updateUIControlState();

  renderDuringTrainingCheckbox.addEventListener('change', () => {
    renderDuringTraining = renderDuringTrainingCheckbox.checked;
  });

  createModelButton.addEventListener('click', async () => {
    // try {
    const hiddenLayerSizes =
      hiddenLayerSizesInput.value.trim().split(',').map(v => {
        const num = Number.parseInt(v.trim());
        if (!(num > 0)) {
          throw new Error(
            `Invalid hidden layer sizes string: ` +
            `${hiddenLayerSizesInput.value}`);
        }
        return num;
      });
    policyNet = new SaveablePolicyNetwork(hiddenLayerSizes);
    console.log('DONE constructing new instance of SaveablePolicyNetwork');
    await updateUIControlState();
    /*} catch (err) {
      logStatus(`ERROR: ${err.message}`);
    }*/
  });

  deleteStoredModelButton.addEventListener('click', async () => {
    if (confirm(`Are you sure you want to delete the locally-stored model?`)) {
      await policyNet.removeModel();
      policyNet = null;
      await updateUIControlState();
    }
  });

  trainButton.addEventListener('click', async () => {
    if (trainButton.textContent === 'Stop') {
      stopRequested = true;
    } else {
      disableModelControls();

      // try {
      const trainIterations = Number.parseInt(numIterationsInput.value);
      if (!(trainIterations > 0)) {
        throw new Error(`Invalid number of iterations: ${trainIterations}`);
      }
      const gamesPerIteration = Number.parseInt(gamesPerIterationInput.value);
      if (!(gamesPerIteration > 0)) {
        throw new Error(
          `Invalid # of games per iterations: ${gamesPerIteration}`);
      }
      const maxStepsPerGame = Number.parseInt(maxStepsPerGameInput.value);
      if (!(maxStepsPerGame > 1)) {
        throw new Error(`Invalid max. steps per game: ${maxStepsPerGame}`);
      }
      const discountRate = Number.parseFloat(discountRateInput.value);
      if (!(discountRate > 0 && discountRate < 1)) {
        throw new Error(`Invalid discount rate: ${discountRate}`);
      }
      const learningRate = Number.parseFloat(learningRateInput.value);

      logStatus(
        'Training policy network... Please wait. ' +
        'Network is saved to IndexedDB at the end of each iteration.');
      const optimizer = tf.train.adam(learningRate);

      meanStepValues = [];
      onIterationEnd(0, trainIterations);
      let t0 = new Date().getTime();
      stopRequested = false;
      for (let i = 0; i < trainIterations; ++i) {
        const gameSteps = await policyNet.train(
          leftPaddle, rightPaddle, ball, optimizer, discountRate, gamesPerIteration,
          maxStepsPerGame);
        const t1 = new Date().getTime();
        const stepsPerSecond = sum(gameSteps) / ((t1 - t0) / 1e3);
        t0 = t1;
        trainSpeed.textContent = `${stepsPerSecond.toFixed(1)} steps/s`
        meanStepValues.push({ x: i + 1, y: mean(gameSteps) });
        console.log(`# of tensors: ${tf.memory().numTensors}`);
        plotSteps();
        onIterationEnd(i + 1, trainIterations);
        await tf.nextFrame();  // Unblock UI thread.
        await policyNet.saveModel();
        await updateUIControlState();

        if (stopRequested) {
          logStatus('Training stopped by user.');
          break;
        }
      }
      if (!stopRequested) {
        logStatus('Training completed.');
      }
      /*} catch (err) {
        logStatus(`ERROR: ${err.message}`);
      }*/
      enableModelControls();
    }
  });

  testButton.addEventListener('click', async () => {
    disableModelControls();
    let isDone = false;
    const ball = new Ball();
    const leftPaddle = new Paddle(ball, false);
    const rightPaddle = new Paddle(ball, true);
    leftPaddle.setRandomState();
    let steps = 0;
    stopRequested = false;
    while (!isDone) {
      steps++;
      tf.tidy(() => {
        const actions = policyNet.getActions(leftPaddle.getStateTensor());
        const action = actions[0];
        logStatus(
          `Test in progress. ` +
          `Action: ${action === 1 ? 'DOWN' : 'UP'} (Step ${steps})`);
        leftPaddle.update(action);
        rightPaddle.update();
        isDone = ball.update(leftPaddle, rightPaddle);
        renderCartPole(leftPaddle, rightPaddle, ball, cartPoleCanvas);
      });
      await tf.nextFrame();  // Unblock UI thread.
      if (stopRequested) {
        break;
      }
    }
    if (stopRequested) {
      logStatus(`Test stopped by user after ${steps} step(s).`);
    } else {
      logStatus(`Test finished. Survived ${steps} step(s).`);
    }
    console.log(`# of tensors: ${tf.memory().numTensors}`);
    enableModelControls();
  });
}
