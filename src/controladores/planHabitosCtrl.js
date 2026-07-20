import { conmysql } from "../db.js";

export const pruebaPlanHabitos = (req, res) => {
  res.send("prueba con éxito - plan_habitos");
};

export const getPlanesHabitos = async (req, res) => {
  try {
    const [result] = await conmysql.query(
      `SELECT ph.*, u.nombre AS nombre_paciente, h.nombre_habito,
              m.medico_id, u2.nombre AS nombre_medico
       FROM plan_habitos ph
       INNER JOIN usuarios u ON u.usuario_id = ph.usuario_id
       INNER JOIN registro_habitos h ON h.habito_id = ph.habito_id
       LEFT JOIN medicos m ON m.medico_id = ph.medico_validador_id
       LEFT JOIN usuarios u2 ON u2.usuario_id = m.usuario_id`
    );

    res.json({
      cant: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Error en getPlanesHabitos:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const getPlanesPorUsuario = async (req, res) => {
  try {

    const { usuario_id } = req.params;


    const [result] = await conmysql.query(
      `
      SELECT

        ph.plan_habito_id,
        ph.usuario_id,
        ph.habito_id,

        h.nombre_habito,

        ph.frecuencia,
        ph.meta,
        ph.estado,

        rc.registro_id,
        rc.fecha,
        rc.cumplido,
        rc.nota


      FROM plan_habitos ph


      INNER JOIN registro_habitos h

      ON h.habito_id = ph.habito_id


      LEFT JOIN registro_cumplimiento rc

      ON rc.plan_habito_id = ph.plan_habito_id

      AND rc.fecha = CURDATE()


      WHERE ph.usuario_id = ?


      ORDER BY ph.plan_habito_id ASC

      `,
      [usuario_id]
    );


    res.json({

      cant: result.length,

      data: result

    });


  } catch (error) {

    console.error(
      "Error en getPlanesPorUsuario:",
      error
    );


    return res.status(500).json({

      message:"Error en el servidor"

    });

  }
};
export const getPlanHabitoxId = async (req, res) => {
  try {
    const [result] = await conmysql.query(
      `SELECT ph.*, h.nombre_habito
       FROM plan_habitos ph
       INNER JOIN registro_habitos h ON h.habito_id = ph.habito_id
       WHERE ph.plan_habito_id = ?`,
      [req.params.id]
    );

    if (result.length <= 0)
      return res.json({ cant: 0, message: "Plan de hábito no encontrado" });

    res.json({
      cant: result.length,
      data: result[0],
    });
  } catch (error) {
    console.error("Error en getPlanHabitoxId:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const postPlanHabito = async (req, res) => {
  try {
    const {
      usuario_id,
      habito_id,
      frecuencia,
      meta,
      estado,
      origen,
      estado_validacion,
      fecha_validacion
    } = req.body;

    if (!usuario_id || !habito_id) {
      return res
        .status(400)
        .json({ message: "usuario_id y habito_id son obligatorios" });
    }

    const _estado = estado || "Activo";
    const _origen = origen || "medico";
    const _estado_validacion = estado_validacion || "aprobado";

    let medico_validador_id = null;

    if (req.user && req.user.rol_id === 2) {
      const usuarioLogueadoId = req.user.usuario_id;

      const [[medico]] = await conmysql.query(
        "SELECT medico_id FROM medicos WHERE usuario_id = ?",
        [usuarioLogueadoId]
      );

      if (medico) {
        medico_validador_id = medico.medico_id;
      }
    }

    const usarFechaValidacion =
      fecha_validacion ||
      (_estado_validacion !== "pendiente" ? new Date() : null);

    const [result] = await conmysql.query(
      `INSERT INTO plan_habitos
       (usuario_id, habito_id, frecuencia, meta, estado, origen,
        estado_validacion, medico_validador_id, fecha_validacion)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        usuario_id,
        habito_id,
        frecuencia || null,
        meta || null,
        _estado,
        _origen,
        _estado_validacion,
        medico_validador_id,
        usarFechaValidacion,
      ]
    );

    res.json({ plan_habito_id: result.insertId });

  } catch (error) {
    console.error("Error en postPlanHabito:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const putPlanHabito = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      frecuencia,
      meta,
      estado,
      origen,
      estado_validacion,
      fecha_validacion
    } = req.body;

    const [result] = await conmysql.query(
      `UPDATE plan_habitos
       SET frecuencia=?, meta=?, estado=?, origen=?,
           estado_validacion=?, fecha_validacion=?
       WHERE plan_habito_id=?`,
      [
        frecuencia,
        meta,
        estado,
        origen,
        estado_validacion,
        fecha_validacion,
        id,
      ]
    );

    if (result.affectedRows <= 0)
      return res.status(404).json({ message: "Plan de hábito no encontrado" });

    const [fila] = await conmysql.query(
      "SELECT * FROM plan_habitos WHERE plan_habito_id=?",
      [id]
    );
    res.json(fila[0]);

  } catch (error) {
    console.error("Error en putPlanHabito:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const deletePlanHabito = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await conmysql.query(
      "DELETE FROM plan_habitos WHERE plan_habito_id = ?",
      [id]
    );

    if (result.affectedRows <= 0)
      return res.status(404).json({ message: "Plan de hábito no encontrado" });

    res.json({ message: "Plan de hábito eliminado correctamente" });
  } catch (error) {
    console.error("Error en deletePlanHabito:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};
