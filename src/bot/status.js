function round(n) { return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function buildStatus(state, bot) {
  const entity = bot?.entity;
  return { state, online: state === 'online', username: bot?.username || null, uuid: bot?.player?.uuid || bot?.uuid || null, health: bot?.health ?? 0, food: bot?.food ?? 0, position: { x: round(entity?.position?.x), y: round(entity?.position?.y), z: round(entity?.position?.z) }, yaw: round(entity?.yaw ?? 0), pitch: round(entity?.pitch ?? 0), dimension: bot?.game?.dimension || null, gameMode: bot?.game?.gameMode || null, ping: bot?.player?.ping ?? null };
}
module.exports = { buildStatus };
