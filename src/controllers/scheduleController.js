// src/controllers/scheduleController.js - NUEVO: Para gestión de horarios de usuarios
const { UserSchedulePreferences, User } = require('../models');
const { Op } = require('sequelize');

class ScheduleController {

  // ✅ Obtener horarios del usuario actual
  async getMySchedule(req, res) {
    try {
      const schedules = await UserSchedulePreferences.getByUser(req.user.id);
      
      res.json({
        success: true,
        data: { schedules }
      });
    } catch (error) {
      console.error('Error al obtener horarios del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener horarios',
        error: error.message
      });
    }
  }

  // ✅ Crear/actualizar horario del usuario
  async updateMySchedule(req, res) {
    try {
      const { schedules } = req.body; // Array de horarios
      const userId = req.user.id;

      // ✅ Desactivar todos los horarios existentes
      await UserSchedulePreferences.update(
        { isActive: false },
        { where: { userId } }
      );

      const updatedSchedules = [];

      // ✅ Crear/activar nuevos horarios
      for (const schedule of schedules) {
        const [scheduleRecord, created] = await UserSchedulePreferences.findOrCreate({
          where: {
            userId,
            dayOfWeek: schedule.dayOfWeek,
            preferredStartTime: schedule.preferredStartTime,
            preferredEndTime: schedule.preferredEndTime
          },
          defaults: {
            userId,
            ...schedule,
            isActive: true
          }
        });

        if (!created) {
          // ✅ Actualizar horario existente
          scheduleRecord.workoutType = schedule.workoutType || scheduleRecord.workoutType;
          scheduleRecord.priority = schedule.priority || scheduleRecord.priority;
          scheduleRecord.notes = schedule.notes || scheduleRecord.notes;
          scheduleRecord.isActive = true;
          await scheduleRecord.save();
        }

        updatedSchedules.push(scheduleRecord);
      }

      res.json({
        success: true,
        message: 'Horarios actualizados exitosamente',
        data: { schedules: updatedSchedules }
      });
    } catch (error) {
      console.error('Error al actualizar horarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar horarios',
        error: error.message
      });
    }
  }

  // ✅ Agregar un horario específico
  async addSchedule(req, res) {
    try {
      const {
        dayOfWeek,
        preferredStartTime,
        preferredEndTime,
        workoutType = 'mixed',
        priority = 3,
        notes
      } = req.body;

      const userId = req.user.id;

      // ✅ Verificar si ya existe un horario similar
      const existingSchedule = await UserSchedulePreferences.findOne({
        where: {
          userId,
          dayOfWeek,
          preferredStartTime,
          preferredEndTime,
          isActive: true
        }
      });

      if (existingSchedule) {
        return res.status(400).json({
          success: false,
          message: 'Ya tienes un horario similar registrado para este día'
        });
      }

      const schedule = await UserSchedulePreferences.create({
        userId,
        dayOfWeek,
        preferredStartTime,
        preferredEndTime,
        workoutType,
        priority,
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Horario agregado exitosamente',
        data: { schedule }
      });
    } catch (error) {
      console.error('Error al agregar horario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar horario',
        error: error.message
      });
    }
  }

  // ✅ Eliminar un horario específico
  async deleteSchedule(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const schedule = await UserSchedulePreferences.findOne({
        where: { id, userId }
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Horario no encontrado'
        });
      }

      // ✅ Soft delete - marcar como inactivo
      schedule.isActive = false;
      await schedule.save();

      res.json({
        success: true,
        message: 'Horario eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar horario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar horario',
        error: error.message
      });
    }
  }

  // ✅ Obtener horarios populares (para análisis del gym)
  async getPopularTimes(req, res) {
    try {
      if (!['admin', 'colaborador'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver esta información'
        });
      }

      const popularTimes = await UserSchedulePreferences.getPopularTimes();

      // ✅ También obtener estadísticas por día de la semana
      const dayStatistics = await UserSchedulePreferences.findAll({
        attributes: [
          'dayOfWeek',
          [UserSchedulePreferences.sequelize.fn('COUNT', UserSchedulePreferences.sequelize.col('id')), 'count'],
          [UserSchedulePreferences.sequelize.fn('AVG', UserSchedulePreferences.sequelize.col('priority')), 'avgPriority']
        ],
        where: { isActive: true },
        group: ['dayOfWeek'],
        order: [['dayOfWeek', 'ASC']]
      });

      // ✅ Estadísticas por tipo de entrenamiento
      const workoutTypeStats = await UserSchedulePreferences.findAll({
        attributes: [
          'workoutType',
          [UserSchedulePreferences.sequelize.fn('COUNT', UserSchedulePreferences.sequelize.col('id')), 'count']
        ],
        where: { isActive: true },
        group: ['workoutType'],
        order: [[UserSchedulePreferences.sequelize.fn('COUNT', UserSchedulePreferences.sequelize.col('id')), 'DESC']]
      });

      res.json({
        success: true,
        data: {
          popularTimes,
          dayStatistics: dayStatistics.map(item => ({
            day: item.dayOfWeek,
            count: parseInt(item.dataValues.count),
            avgPriority: parseFloat(item.dataValues.avgPriority).toFixed(1)
          })),
          workoutTypeStats: workoutTypeStats.map(item => ({
            type: item.workoutType,
            count: parseInt(item.dataValues.count)
          }))
        }
      });
    } catch (error) {
      console.error('Error al obtener horarios populares:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de horarios',
        error: error.message
      });
    }
  }

  // ✅ Obtener disponibilidad del gym por horario
  async getGymAvailability(req, res) {
    try {
      const { dayOfWeek, date } = req.query;

      if (!dayOfWeek) {
        return res.status(400).json({
          success: false,
          message: 'Día de la semana es requerido'
        });
      }

      // ✅ Obtener todos los horarios para ese día
      const schedules = await UserSchedulePreferences.findAll({
        where: {
          dayOfWeek,
          isActive: true
        },
        attributes: ['preferredStartTime', 'preferredEndTime'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName']
        }]
      });

      // ✅ Agrupar por horarios y contar usuarios
      const timeSlots = {};
      
      schedules.forEach(schedule => {
        const timeKey = `${schedule.preferredStartTime}-${schedule.preferredEndTime}`;
        if (!timeSlots[timeKey]) {
          timeSlots[timeKey] = {
            startTime: schedule.preferredStartTime,
            endTime: schedule.preferredEndTime,
            userCount: 0,
            users: []
          };
        }
        timeSlots[timeKey].userCount++;
        timeSlots[timeKey].users.push(schedule.user.firstName + ' ' + schedule.user.lastName);
      });

      // ✅ Convertir a array y ordenar por hora
      const availability = Object.values(timeSlots).sort((a, b) => 
        a.startTime.localeCompare(b.startTime)
      );

      res.json({
        success: true,
        data: {
          dayOfWeek,
          date,
          availability,
          totalUsers: schedules.length
        }
      });
    } catch (error) {
      console.error('Error al obtener disponibilidad del gym:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener disponibilidad',
        error: error.message
      });
    }
  }

  // ✅ Crear horarios por defecto para nuevo usuario
  async createDefaultSchedule(req, res) {
    try {
      const { userId } = req.body;
      
      // ✅ Solo admin puede crear horarios para otros usuarios
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para crear horarios para otro usuario'
        });
      }

      const targetUserId = userId || req.user.id;

      // ✅ Verificar que el usuario existe
      const user = await User.findByPk(targetUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // ✅ Verificar si ya tiene horarios
      const existingSchedules = await UserSchedulePreferences.findAll({
        where: { userId: targetUserId, isActive: true }
      });

      if (existingSchedules.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'El usuario ya tiene horarios configurados'
        });
      }

      // ✅ Crear horarios por defecto
      const defaultSchedules = await UserSchedulePreferences.createDefaultSchedule(targetUserId);

      res.status(201).json({
        success: true,
        message: 'Horarios por defecto creados exitosamente',
        data: { schedules: defaultSchedules }
      });
    } catch (error) {
      console.error('Error al crear horarios por defecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear horarios por defecto',
        error: error.message
      });
    }
  }

  // ✅ NUEVO: Admin/Colaborador crea horario para cualquier usuario
  async addScheduleForUser(req, res) {
    try {
      const {
        userId,
        dayOfWeek,
        preferredStartTime,
        preferredEndTime,
        workoutType = 'mixed',
        priority = 3,
        notes
      } = req.body;

      // ✅ Verificar que el usuario existe
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // ✅ Verificar si ya existe un horario similar
      const existingSchedule = await UserSchedulePreferences.findOne({
        where: {
          userId,
          dayOfWeek,
          preferredStartTime,
          preferredEndTime,
          isActive: true
        }
      });

      if (existingSchedule) {
        return res.status(400).json({
          success: false,
          message: 'El usuario ya tiene un horario similar registrado para este día'
        });
      }

      // ✅ Crear el horario
      const schedule = await UserSchedulePreferences.create({
        userId,
        dayOfWeek,
        preferredStartTime,
        preferredEndTime,
        workoutType,
        priority,
        notes: notes || `Horario creado por ${req.user.role}: ${req.user.firstName} ${req.user.lastName}`
      });

      // ✅ Obtener el horario con información del usuario
      const scheduleWithUser = await UserSchedulePreferences.findByPk(schedule.id, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Horario agregado exitosamente para el usuario',
        data: { schedule: scheduleWithUser }
      });
    } catch (error) {
      console.error('Error al agregar horario para usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar horario',
        error: error.message
      });
    }
  }

  // ✅ NUEVO: Admin/Colaborador obtiene horarios de cualquier usuario
  async getUserSchedule(req, res) {
    try {
      const { userId } = req.params;

      // ✅ Verificar que el usuario existe
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const schedules = await UserSchedulePreferences.getByUser(userId);
      
      res.json({
        success: true,
        data: { 
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          },
          schedules 
        }
      });
    } catch (error) {
      console.error('Error al obtener horarios del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener horarios',
        error: error.message
      });
    }
  }

  // ✅ NUEVO: Admin/Colaborador actualiza horarios de cualquier usuario
  async updateUserSchedule(req, res) {
    try {
      const { userId } = req.params;
      const { schedules } = req.body;

      // ✅ Verificar que el usuario existe
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // ✅ Desactivar todos los horarios existentes del usuario
      await UserSchedulePreferences.update(
        { isActive: false },
        { where: { userId } }
      );

      const updatedSchedules = [];

      // ✅ Crear/activar nuevos horarios
      for (const schedule of schedules) {
        const [scheduleRecord, created] = await UserSchedulePreferences.findOrCreate({
          where: {
            userId,
            dayOfWeek: schedule.dayOfWeek,
            preferredStartTime: schedule.preferredStartTime,
            preferredEndTime: schedule.preferredEndTime
          },
          defaults: {
            userId,
            ...schedule,
            isActive: true,
            notes: schedule.notes || `Actualizado por ${req.user.role}: ${req.user.firstName} ${req.user.lastName}`
          }
        });

        if (!created) {
          scheduleRecord.workoutType = schedule.workoutType || scheduleRecord.workoutType;
          scheduleRecord.priority = schedule.priority || scheduleRecord.priority;
          scheduleRecord.notes = schedule.notes || scheduleRecord.notes;
          scheduleRecord.isActive = true;
          await scheduleRecord.save();
        }

        updatedSchedules.push(scheduleRecord);
      }

      res.json({
        success: true,
        message: `Horarios actualizados exitosamente para ${user.firstName} ${user.lastName}`,
        data: { schedules: updatedSchedules }
      });
    } catch (error) {
      console.error('Error al actualizar horarios del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar horarios',
        error: error.message
      });
    }
  }

  // ✅ NUEVO: Admin/Colaborador elimina horario de cualquier usuario
  async deleteUserSchedule(req, res) {
    try {
      const { userId, scheduleId } = req.params;

      const schedule = await UserSchedulePreferences.findOne({
        where: { id: scheduleId, userId }
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Horario no encontrado'
        });
      }

      // ✅ Soft delete - marcar como inactivo
      schedule.isActive = false;
      await schedule.save();

      res.json({
        success: true,
        message: 'Horario eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar horario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar horario',
        error: error.message
      });
    }
  }

  // ✅ NUEVO: Obtener slots disponibles del gimnasio desde BD (SIN HARDCODEO)
  async getGymTimeSlots(req, res) {
    try {
      const { GymTimeSlots } = require('../models');
      
      console.log('🔍 Consultando slots desde BD...');
      
      // Obtener TODOS los slots activos de la BD
      const slots = await GymTimeSlots.findAll({
        where: { isActive: true },
        attributes: ['id', 'openTime', 'closeTime', 'capacity', 'currentReservations', 'slotLabel', 'displayOrder'],
        order: [['displayOrder', 'ASC'], ['openTime', 'ASC']]
      });
      
      if (slots.length === 0) {
        console.log('⚠️ No hay slots configurados en la BD');
        return res.json({
          success: true,
          data: {
            timeSlots: [],
            message: 'No hay horarios configurados en el sistema'
          }
        });
      }
      
      // Calcular disponibilidad actual de cada slot
      const scheduleStats = await UserSchedulePreferences.findAll({
        where: { isActive: true },
        attributes: [
          'preferredStartTime',
          'preferredEndTime',
          [UserSchedulePreferences.sequelize.fn('COUNT', UserSchedulePreferences.sequelize.col('id')), 'userCount']
        ],
        group: ['preferredStartTime', 'preferredEndTime']
      });
      
      // Crear mapa de uso real
      const usageMap = {};
      scheduleStats.forEach(stat => {
        const key = `${stat.preferredStartTime}-${stat.preferredEndTime}`;
        usageMap[key] = parseInt(stat.dataValues.userCount);
      });
      
      // Formatear slots con disponibilidad real
      const timeSlots = slots.map(slot => {
        const key = `${slot.openTime}-${slot.closeTime}`;
        const realUsage = usageMap[key] || slot.currentReservations || 0;
        const available = Math.max(0, slot.capacity - realUsage);
        
        return {
          id: slot.id,
          name: slot.slotLabel || `${slot.openTime.slice(0, 5)} - ${slot.closeTime.slice(0, 5)}`,
          startTime: slot.openTime.slice(0, 5),
          endTime: slot.closeTime.slice(0, 5),
          maxCapacity: slot.capacity,
          currentUsers: realUsage,
          available: available,
          percentage: slot.capacity > 0 ? Math.round((available / slot.capacity) * 100) : 0
        };
      });
      
      console.log(`✅ ${timeSlots.length} slots obtenidos desde BD`);
      
      res.json({
        success: true,
        data: {
          timeSlots,
          total: timeSlots.length,
          source: 'database'
        }
      });
      
    } catch (error) {
      console.error('❌ Error al obtener slots:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener horarios disponibles',
        error: error.message
      });
    }
  }
}

module.exports = new ScheduleController();