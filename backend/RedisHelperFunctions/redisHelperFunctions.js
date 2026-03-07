async function addUserToResume(redisClient, resumeId, userEmail) {
  await redisClient.sAdd(`resume:${resumeId}:users`, userEmail);
}

async function removeUserFromResume(redisClient, resumeId, userEmail) {
  await redisClient.sRem(`resume:${resumeId}:users`, userEmail);

  // auto-clean if no users left
  const remaining = await redisClient.sCard(`resume:${resumeId}:users`);
  if (remaining === 0) {
    await redisClient.del(`resume:${resumeId}:users`);
  }
}

async function getUsersInResume(redisClient, resumeId) {
  return await redisClient.sMembers(`resume:${resumeId}:users`);
}

export { addUserToResume, removeUserFromResume, getUsersInResume };
