import { DataTypes } from 'sequelize';

export default function definePrediction(sequelize) {
  return sequelize.define('Prediction', {
    guildId: { type: DataTypes.STRING, allowNull: false },
    channelId: { type: DataTypes.STRING, allowNull: false },
    authorId: { type: DataTypes.STRING, allowNull: false },
    targetId: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false }, // 'message', 'reaction', 'counter'
    content: { type: DataTypes.STRING, allowNull: false },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
  });
}
