const redisService = require('../services/redisService');
const elasticService = require('../services/elasticService');
const rabbitMQService = require('../services/rabbitMQService');

// Create Resource
async function createData(req, res) {
    const id = `resource:${req.body.objectId}`;
    try {
        await redisService.setParentChildData(id, req.body);
        await elasticService.indexParentChildData(req.body.objectId, req.body);
        await rabbitMQService.sendToQueue(req.body);

        res.status(201).send('Resource created and queued');
    } catch (err) {
        res.status(500).send(err.message);
    }
}

// Read Resource
async function readData(req, res) {
    const id = `resource:${req.params.id}`;
    try {
        const data = await redisService.getParentChildData(id);
        if (!data) return res.status(404).send('Resource not found');
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
}
// Update Resource (Full)
async function updateData(req, res) {
    const id = `resource:${req.params.id}`;
    try {
        const existingData = await redisService.getParentChildData(id);
        if (!existingData) return res.status(404).send('Resource not found');

        const updatedData = { ...existingData, ...req.body };
        await redisService.setParentChildData(id, updatedData);
        await elasticService.indexParentChildData(req.params.id, updatedData);
        await rabbitMQService.sendToQueue(updatedData);

        res.status(200).send('Resource updated and queued');
    } catch (err) {
        res.status(500).send(err.message);
    }
}

// Patch Resource (Partial Update)
async function patchData(req, res) {
    const id = `resource:${req.params.id}`;
    try {
        // Retrieve the existing data
        const existingData = await redisService.getParentChildData(id);
        if (!existingData) return res.status(404).send('Resource not found');

        // Merge the patch data into the existing data
        const updatedData = {
            ...existingData,
            ...req.body,
            linkedPlanServices: mergeLinkedPlanServices(existingData.linkedPlanServices, req.body.linkedPlanServices)
        };

        // Save the merged data back to Redis and Elasticsearch
        await redisService.setParentChildData(id, updatedData,true);
        await elasticService.indexParentChildData(req.params.id, updatedData, true);
        await rabbitMQService.sendToQueue(updatedData);

        res.status(200).send('Resource patched and queued');
    } catch (err) {
        res.status(500).send(err.message);
    }
}

// Helper function to merge linkedPlanServices arrays
function mergeLinkedPlanServices(existingServices = [], newServices = []) {
    const mergedServices = [...existingServices];

    for (const newService of newServices) {
        const existingServiceIndex = mergedServices.findIndex(
            (service) => service.objectId === newService.objectId
        );

        if (existingServiceIndex === -1) {
            // If the service does not exist, add it as a new entry
            mergedServices.push(newService);
        } else {
            // If the service exists, merge the new data with the existing service
            mergedServices[existingServiceIndex] = {
                ...mergedServices[existingServiceIndex],
                ...newService
            };
        }
    }

    return mergedServices;
}

// Delete Resource
// async function deleteData(req, res) {
//     const id = `resource:${req.params.id}`;
//     try {
//         await redisService.deleteParentChildData(id);
//         await elasticService.deleteData(req.params.id);
//         await rabbitMQService.sendToQueue({ action: 'delete', id });

//         res.status(200).send(`Resource ${id} deleted and deletion queued`);
//     } catch (err) {
//         res.status(500).send(err.message);
//     }
// }

async function deleteAllData(req, res) {
    try {
        // Delete all data from Redis
        await redisService.deleteAllData();

        // Delete all documents from Elasticsearch
        await elasticService.deleteAllData();

        // Optionally, send a message to RabbitMQ to notify about the deletion
        await rabbitMQService.sendToQueue({ action: 'deleteAll' });

        res.status(200).send('All resources deleted and deletion queued');
    } catch (err) {
        res.status(500).send(err.message);
    }
}

// Start RabbitMQ Consumer
rabbitMQService.receiveFromQueue();

module.exports = {
    createData,
    readData,
    updateData,
    patchData,
    deleteAllData,
};