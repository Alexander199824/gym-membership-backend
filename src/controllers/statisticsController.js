// src/controllers/statisticsController.js - NUEVO: Controller dedicado para estadísticas
const { GymStatistics } = require('../models');

class StatisticsController {
  constructor() {
    // Bindear métodos
    this.getActiveStatistics = this.getActiveStatistics.bind(this);
    this.getAllStatistics = this.getAllStatistics.bind(this);
    this.getStatisticById = this.getStatisticById.bind(this);
    this.createStatistic = this.createStatistic.bind(this);
    this.updateStatistic = this.updateStatistic.bind(this);
    this.deleteStatistic = this.deleteStatistic.bind(this);
    this.toggleStatistic = this.toggleStatistic.bind(this);
    this.reorderStatistics = this.reorderStatistics.bind(this);
    this.seedDefaultStatistics = this.seedDefaultStatistics.bind(this);
  }

  // ✅ GET /api/gym/stats - Estadísticas activas para el frontend
  async getActiveStatistics(req, res) {
    try {
      const statistics = await GymStatistics.getActiveStats();
      
      // Formatear para el frontend con toda la info necesaria
      const formattedStats = statistics.map(stat => ({
        id: stat.id,
        number: stat.valueSuffix ? `${stat.statValue}${stat.valueSuffix}` : stat.statValue,
        label: stat.label,
        icon: stat.iconName,
        color: stat.colorScheme,
        description: stat.description || null
      }));

      res.json({
        success: true,
        data: formattedStats,
        total: formattedStats.length
      });
    } catch (error) {
      console.error('Error al obtener estadísticas activas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  // ✅ GET /api/admin/statistics - Todas las estadísticas (admin)
  async getAllStatistics(req, res) {
    try {
      const statistics = await GymStatistics.getAllStats();
      
      res.json({
        success: true,
        data: statistics,
        total: statistics.length
      });
    } catch (error) {
      console.error('Error al obtener todas las estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  // ✅ GET /api/admin/statistics/:id - Una estadística específica
  async getStatisticById(req, res) {
    try {
      const { id } = req.params;
      
      const statistic = await GymStatistics.findByPk(id);
      
      if (!statistic) {
        return res.status(404).json({
          success: false,
          message: 'Estadística no encontrada'
        });
      }

      res.json({
        success: true,
        data: statistic
      });
    } catch (error) {
      console.error('Error al obtener estadística:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadística',
        error: error.message
      });
    }
  }

  // ✅ POST /api/admin/statistics - Crear nueva estadística
  async createStatistic(req, res) {
    try {
      const {
        statKey,
        statValue,
        label,
        iconName,
        valueSuffix,
        colorScheme,
        displayOrder,
        description,
        isActive
      } = req.body;

      // Validaciones
      if (!statKey || !statValue || !label) {
        return res.status(400).json({
          success: false,
          message: 'statKey, statValue y label son requeridos'
        });
      }

      // Verificar si ya existe
      const existing = await GymStatistics.findOne({ where: { statKey } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Ya existe una estadística con la clave: ${statKey}`
        });
      }

      // Crear
      const newStatistic = await GymStatistics.create({
        statKey,
        statValue: parseInt(statValue),
        label,
        iconName: iconName || 'TrendingUp',
        valueSuffix: valueSuffix || '+',
        colorScheme: colorScheme || 'primary',
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : 999,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true
      });

      res.status(201).json({
        success: true,
        message: 'Estadística creada exitosamente',
        data: newStatistic
      });
    } catch (error) {
      console.error('Error al crear estadística:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear estadística',
        error: error.message
      });
    }
  }

  // ✅ PUT /api/admin/statistics/:id - Actualizar estadística
  async updateStatistic(req, res) {
    try {
      const { id } = req.params;
      const {
        statKey,
        statValue,
        label,
        iconName,
        valueSuffix,
        colorScheme,
        displayOrder,
        description,
        isActive
      } = req.body;

      const statistic = await GymStatistics.findByPk(id);
      
      if (!statistic) {
        return res.status(404).json({
          success: false,
          message: 'Estadística no encontrada'
        });
      }

      // Si se cambia el statKey, verificar que no exista
      if (statKey && statKey !== statistic.statKey) {
        const existing = await GymStatistics.findOne({ 
          where: { statKey } 
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Ya existe una estadística con la clave: ${statKey}`
          });
        }
      }

      // Actualizar campos
      if (statKey !== undefined) statistic.statKey = statKey;
      if (statValue !== undefined) statistic.statValue = parseInt(statValue);
      if (label !== undefined) statistic.label = label;
      if (iconName !== undefined) statistic.iconName = iconName;
      if (valueSuffix !== undefined) statistic.valueSuffix = valueSuffix;
      if (colorScheme !== undefined) statistic.colorScheme = colorScheme;
      if (displayOrder !== undefined) statistic.displayOrder = parseInt(displayOrder);
      if (description !== undefined) statistic.description = description;
      if (isActive !== undefined) statistic.isActive = isActive;

      await statistic.save();

      res.json({
        success: true,
        message: 'Estadística actualizada exitosamente',
        data: statistic
      });
    } catch (error) {
      console.error('Error al actualizar estadística:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar estadística',
        error: error.message
      });
    }
  }

  // ✅ DELETE /api/admin/statistics/:id - Eliminar estadística
  async deleteStatistic(req, res) {
    try {
      const { id } = req.params;
      
      const statistic = await GymStatistics.findByPk(id);
      
      if (!statistic) {
        return res.status(404).json({
          success: false,
          message: 'Estadística no encontrada'
        });
      }

      await statistic.destroy();

      res.json({
        success: true,
        message: 'Estadística eliminada exitosamente',
        data: { id: parseInt(id) }
      });
    } catch (error) {
      console.error('Error al eliminar estadística:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar estadística',
        error: error.message
      });
    }
  }

  // ✅ PATCH /api/admin/statistics/:id/toggle - Activar/Desactivar
  async toggleStatistic(req, res) {
    try {
      const { id } = req.params;
      
      const statistic = await GymStatistics.findByPk(id);
      
      if (!statistic) {
        return res.status(404).json({
          success: false,
          message: 'Estadística no encontrada'
        });
      }

      statistic.isActive = !statistic.isActive;
      await statistic.save();

      res.json({
        success: true,
        message: `Estadística ${statistic.isActive ? 'activada' : 'desactivada'}`,
        data: {
          id: statistic.id,
          isActive: statistic.isActive
        }
      });
    } catch (error) {
      console.error('Error al cambiar estado de estadística:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cambiar estado',
        error: error.message
      });
    }
  }

  // ✅ PUT /api/admin/statistics/reorder - Reordenar estadísticas
  async reorderStatistics(req, res) {
    try {
      const { order } = req.body; // Array de { id, displayOrder }

      if (!Array.isArray(order) || order.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de orden con formato [{id, displayOrder}]'
        });
      }

      // Actualizar cada estadística
      const updatePromises = order.map(item => 
        GymStatistics.update(
          { displayOrder: item.displayOrder },
          { where: { id: item.id } }
        )
      );

      await Promise.all(updatePromises);

      res.json({
        success: true,
        message: 'Orden actualizado exitosamente',
        data: { updatedCount: order.length }
      });
    } catch (error) {
      console.error('Error al reordenar estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reordenar estadísticas',
        error: error.message
      });
    }
  }

  // ✅ POST /api/admin/statistics/seed - Crear estadísticas por defecto
  async seedDefaultStatistics(req, res) {
    try {
      await GymStatistics.seedDefaultStats();

      const statistics = await GymStatistics.getAllStats();

      res.json({
        success: true,
        message: 'Estadísticas por defecto creadas exitosamente',
        data: statistics,
        total: statistics.length
      });
    } catch (error) {
      console.error('Error al crear estadísticas por defecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear estadísticas por defecto',
        error: error.message
      });
    }
  }
}

module.exports = new StatisticsController();