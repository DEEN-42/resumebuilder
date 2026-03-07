import { Queue } from "bullmq";

let deployQueue;

export function getDeployQueue(redisOpts) {
  if (!deployQueue) {
    deployQueue = new Queue("portfolio-deploy", { connection: redisOpts });
  }
  return deployQueue;
}
