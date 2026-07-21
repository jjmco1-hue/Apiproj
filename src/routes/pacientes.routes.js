import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyRole } from "../middlewares/verifyRole.js";

import {
  pruebaPacientes,
  getPacientes,
  getPacientexId,
  deletePaciente,
  crearPaciente
} from "../controladores/pacientesCtrl.js";

const router = Router();

router.get("/pacientes/prueba", pruebaPacientes);

router.get("/pacientes", verifyToken, verifyRole([1, 2, 3]), getPacientes);

router.get("/pacientes/:id", verifyToken, verifyRole([1, 2, 3]), getPacientexId);
router.post(
  "/pacientes",
  crearPaciente
);
router.delete("/pacientes/:id", verifyToken, verifyRole([1]), deletePaciente);


export default router;