// src/controladores/solicitudesCtrl.js
import { conmysql } from "../db.js";
import cloudinary from "../cloudinary.js";

export const pruebaSolicitudes = (req, res) => {
  res.send("prueba con éxito - solicitudes_certificacion");
};

export const getSolicitudes = async (req, res) => {
  try {
    const { estado } = req.query;

    let sql = `
      SELECT 
        s.*,
        u.nombre,
        u.correo,
        a.nivel_acceso
      FROM solicitudes_certificacion s
      INNER JOIN usuarios u ON u.usuario_id = s.usuario_id
      LEFT JOIN administradores a ON a.admin_id = s.revisado_por
    `;
    const params = [];

    if (estado) {
      sql += " WHERE s.estado = ?";
      params.push(estado);
    }

    sql += " ORDER BY s.fecha_solicitud DESC";

    const [result] = await conmysql.query(sql, params);

    res.json({
      cant: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Error en getSolicitudes:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const getSolicitudxId = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await conmysql.query(
      `SELECT 
         s.*,
         u.nombre,
         u.correo,
         a.nivel_acceso
       FROM solicitudes_certificacion s
       INNER JOIN usuarios u ON u.usuario_id = s.usuario_id
       LEFT JOIN administradores a ON a.admin_id = s.revisado_por
       WHERE s.solicitud_id = ?`,
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        cant: 0,
        message: "Solicitud no encontrada",
      });
    }

    res.json({
      cant: result.length,
      data: result[0],
    });
  } catch (error) {
    console.error("Error en getSolicitudxId:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const postSolicitud = async (req, res) => {
  try {
    const { usuario_id, numero_licencia, especialidad, institucion } = req.body;

    if (!usuario_id || !numero_licencia || !especialidad || !institucion) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    let documento_adjunto = null;

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "solicitudes_certificacion",
            resource_type: "raw", 
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      documento_adjunto = uploadResult.secure_url;
    } else if (req.body.documento_adjunto) {
      documento_adjunto = req.body.documento_adjunto;
    }

    const [result] = await conmysql.query(
      `INSERT INTO solicitudes_certificacion
       (usuario_id, numero_licencia, especialidad, institucion, documento_adjunto)
       VALUES (?,?,?,?,?)`,
      [usuario_id, numero_licencia, especialidad, institucion, documento_adjunto]
    );

    res.status(201).json({
      solicitud_id: result.insertId,
      documento_adjunto,
      estado: "pendiente",
    });
  } catch (error) {
    console.error("Error en postSolicitud:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const putSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, comentarios_revision } = req.body;

    if (!estado || !["aprobada", "rechazada", "pendiente"].includes(estado)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    const [currentRows] = await conmysql.query(
      "SELECT * FROM solicitudes_certificacion WHERE solicitud_id = ?",
      [id]
    );

    if (currentRows.length === 0) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    const usuarioLogueadoId = req.user?.usuario_id || null;

    let adminId = null;
    if (usuarioLogueadoId) {
      const [adminRows] = await conmysql.query(
        "SELECT admin_id FROM administradores WHERE usuario_id = ?",
        [usuarioLogueadoId]
      );
      if (adminRows.length > 0) {
        adminId = adminRows[0].admin_id;
      }
    }

   const [result] = await conmysql.query(
  `UPDATE solicitudes_certificacion
   SET estado = ?,
       fecha_revision = NOW(),
       revisado_por = ?,
       comentarios_revision = ?
   WHERE solicitud_id = ?`,
  [estado, adminId, comentarios_revision || null, id]
);

if (result.affectedRows === 0) {
  return res.status(404).json({ message: "Solicitud no encontrada" });
}

// ===============================
// SI LA SOLICITUD ES APROBADA
// ===============================
if (estado === "aprobada" && adminId) {

  await conmysql.query(
    `UPDATE medicos
     SET
        certificado_por = ?,
        estado_certificacion = 'aprobada'
     WHERE usuario_id = ?`,
    [adminId, currentRows[0].usuario_id]
  );

}

// ===============================
// SI LA SOLICITUD ES RECHAZADA
// ===============================
if (estado === "rechazada") {

  await conmysql.query(
    `UPDATE medicos
     SET
        estado_certificacion = 'rechazada'
     WHERE usuario_id = ?`,
    [currentRows[0].usuario_id]
  );

}

const [fila] = await conmysql.query(
  "SELECT * FROM solicitudes_certificacion WHERE solicitud_id = ?",
  [id]
);

res.json(fila[0]);

} catch (error) {
  console.error("Error en putSolicitud:", error);
  return res.status(500).json({ message: "Error en el servidor" });
}
};

export const deleteSolicitud = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await conmysql.query(
      "DELETE FROM solicitudes_certificacion WHERE solicitud_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    res.json({ message: "Solicitud eliminada correctamente" });
  } catch (error) {
    console.error("Error en deleteSolicitud:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};
