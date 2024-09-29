const express = require('express');
const router = express.Router();
const resourceController = require('../controller/resourceController');
const validateData = require('../middleware/validate');
const authenticateToken = require('../middleware/jwtAuth');


router.post('/', authenticateToken, validateData, resourceController.createData);
router.get('/:id', authenticateToken, resourceController.readData);
router.put('/:id', authenticateToken, validateData, resourceController.updateData);
router.patch('/:id', authenticateToken, validateData, resourceController.patchData); // PATCH route
// router.delete('/:id', authenticateToken, resourceController.deleteData);
// Route to delete all resources
router.delete('/all', authenticateToken, resourceController.deleteAllData);
module.exports = router;