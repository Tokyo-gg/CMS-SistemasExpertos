import { Reaction, REACTION_TYPES } from "../models/Reaction.js";
import { findPublicPostById } from "./post.service.js";
import { AppError } from "../utils/AppError.js";

const checkType = (type) => {
  if (typeof type !== "string" || !REACTION_TYPES.includes(type)) {
    throw new AppError(
      `Tipo de reacción inválido. Permitidos: ${REACTION_TYPES.join(", ")}`,
      400,
    );
  }
};

// El total se cuenta sobre las filas, no con un contador que se incrementa
async function summary(postId, userId) {
  const [entries, mine] = await Promise.all([
    Promise.all(
      REACTION_TYPES.map(async (t) => [
        t,
        await Reaction.countDocuments({ postId, type: t }),
      ]),
    ),
    userId ? Reaction.find({ postId, userId }).distinct("type") : [],
  ]);
  return { counts: Object.fromEntries(entries), mine };
}

export async function getReactions(postId) {
  await findPublicPostById(postId);
  return summary(postId);
}

export async function addReaction(postId, userId, type) {
  checkType(type);
  await findPublicPostById(postId);
  try {
    await Reaction.create({ postId, userId, type });
  } catch (e) {
    if (e.code !== 11000) throw e; // ya existía: el resultado es el mismo
  }
  return summary(postId, userId);
}

export async function removeReaction(postId, userId, type) {
  checkType(type);
  await Reaction.deleteOne({ postId, userId, type }); // si no existe, no pasa nada
  return summary(postId, userId);
}
