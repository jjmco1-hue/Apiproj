import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyRole } from "../middlewares/verifyRole.js";
import { uploadPDF } from "../middlewares/upload.js";

import {
  pruebaMedicos,
  getMedicos,
  getMedicoxId,
  postMedico,
  putMedico,
  deleteMedico,
  getPerfilMedico
} from "../controladores/medicosCtrl.js";


const router = Router();


router.get("/prueba", pruebaMedicos);


// Obtener todos los médicos
router.get(
  "/medicos",
  verifyToken,
  getMedicos
);


// Obtener médico por ID
router.get(
  "/medicos/:id",
  verifyToken,
  getMedicoxId
);


// ⭐ PERFIL DEL MÉDICO LOGUEADO
// NO recibe id
// usa el usuario_id del JWT
router.get(
  "/medicos/perfil",
  verifyToken,
  verifyRole([2]),
  getPerfilMedico
);


router.post(
  "/medicos",
  verifyToken,
  uploadPDF.single("documento_certificacion"),
  postMedico
);


router.put(
  "/medicos/:id",
  verifyToken,
  uploadPDF.single("documento_certificacion"),
  putMedico
);


router.delete(
  "/medicos/:id",
  verifyToken,
  deleteMedico
);


export default router;