const redis = require('redis');
const client = redis.createClient();

client.on('connect', () => {
    console.log('Connected to Redis...');
});

client.on('error', (err) => {
    console.error('Redis Client Error', err);
});

async function connectRedis() {
    if (!client.isOpen) {
        console.log('connectRedis is called...');
        await client.connect();
    }
}

async function setParentChildData(key, data, isPatch = false) {
    await connectRedis();

    // Retrieve existing data if patching
    let existingData = {};
    if (isPatch) {
        const existingDataString = await client.get(key);
        if (existingDataString) {
            existingData = JSON.parse(existingDataString);
        }
    }

    // Store the parent data (Plan)
    const parentKey = `resource:${data.objectId}`;
    const parentData = {
        ...(!isPatch ? {} : existingData),
        planType: data.planType,
        creationDate: data.creationDate,
        _org: data._org,
        objectType: data.objectType
    };
    await client.set(parentKey, JSON.stringify(parentData));

    // Store the PlanCostShares as a child of the Plan
    const costShareKey = `resource:${data.planCostShares.objectId}`;
    const costShareData = {
        ...(!isPatch ? {} : existingData.planCostShares || {}),
        ...data.planCostShares
    };
    await client.set(costShareKey, JSON.stringify(costShareData));

    // Store the LinkedPlanServices and its children (LinkedService and PlanServiceCostShares)
    const mergedLinkedPlanServices = isPatch ? mergeLinkedPlanServices(existingData.linkedPlanServices || [], data.linkedPlanServices || []) : data.linkedPlanServices;

    for (const service of mergedLinkedPlanServices) {
        // Store LinkedPlanServices itself
        const serviceKey = `resource:${service.objectId}`;
        const serviceData = {
            ...(!isPatch ? {} : existingData.linkedPlanServices?.find(s => s.objectId === service.objectId) || {}),
            _org: service._org,
            objectType: service.objectType
        };
        await client.set(serviceKey, JSON.stringify(serviceData));

        // Store LinkedService as a child of LinkedPlanServices
        const childKeyService = `resource:${service.linkedService.objectId}`;
        const linkedServiceData = {
            ...(!isPatch ? {} : existingData.linkedPlanServices?.find(s => s.objectId === service.objectId)?.linkedService || {}),
            ...service.linkedService
        };
        await client.set(childKeyService, JSON.stringify(linkedServiceData));

        // Store PlanServiceCostShares as a child of LinkedPlanServices
        const childKeyCostShare = `resource:${service.planserviceCostShares.objectId}`;
        const planServiceCostSharesData = {
            ...(!isPatch ? {} : existingData.linkedPlanServices?.find(s => s.objectId === service.objectId)?.planserviceCostShares || {}),
            ...service.planserviceCostShares
        };
        await client.set(childKeyCostShare, JSON.stringify(planServiceCostSharesData));
    }

    console.log('Parent and child data stored successfully in Redis');
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
            // If the service exists, merge the data
            mergedServices[existingServiceIndex] = {
                ...mergedServices[existingServiceIndex],
                ...newService
            };
        }
    }

    return mergedServices;
}
async function getParentChildData(key) {
    await connectRedis();

    // Retrieve the parent data
    const parentData = await client.get(key);
    if (!parentData) {
        return null;
    }

    const parsedParentData = JSON.parse(parentData);

    // Retrieve the PlanCostShares data if it exists
    if (parsedParentData.planCostShares && parsedParentData.planCostShares.objectId) {
        const costShareKey = `resource:${parsedParentData.planCostShares.objectId}`;
        const costShareData = await client.get(costShareKey);
        if (costShareData) {
            parsedParentData.planCostShares = JSON.parse(costShareData);
        }
    }

    // Retrieve the linkedPlanServices and their children
    const linkedPlanServices = parsedParentData.linkedPlanServices || [];

    for (const service of linkedPlanServices) {
        const serviceKey = `resource:${service.objectId}`;
        const linkedServiceData = await client.get(serviceKey);
        if (linkedServiceData) {
            const parsedService = JSON.parse(linkedServiceData);

            // Retrieve LinkedService if it exists
            if (parsedService.linkedService && parsedService.linkedService.objectId) {
                const childKeyService = `resource:${parsedService.linkedService.objectId}`;
                const childDataService = await client.get(childKeyService);
                if (childDataService) {
                    parsedService.linkedService = JSON.parse(childDataService);
                }
            }

            // Retrieve PlanServiceCostShares if it exists
            if (parsedService.planserviceCostShares && parsedService.planserviceCostShares.objectId) {
                const childKeyCostShare = `resource:${parsedService.planserviceCostShares.objectId}`;
                const childDataCostShare = await client.get(childKeyCostShare);
                if (childDataCostShare) {
                    parsedService.planserviceCostShares = JSON.parse(childDataCostShare);
                }
            }

            // Add to linkedPlanServices
            parsedParentData.linkedPlanServices.push(parsedService);
        }
    }

    return parsedParentData;
}
async function deleteParentChildData(parentKey) {
    await connectRedis();
    console.log('Deleting parent and associated child data for key:', parentKey);

    try {
        // Retrieve the parent data to find associated children
        const parentData = await client.get(parentKey);
        if (!parentData) {
            console.log('Parent data not found:', parentKey);
            return;
        }

        const parsedParentData = JSON.parse(parentData);

        // Create an array to hold all the keys that need to be deleted
        const keysToDelete = [parentKey];

        // Attempt to add PlanCostShares to keysToDelete
        if (parsedParentData.planCostShares && parsedParentData.planCostShares.objectId) {
            const costShareKey = `resource:${parsedParentData.planCostShares.objectId}`;
            keysToDelete.push(costShareKey);
        }

        // Attempt to add each LinkedPlanService and its related children to keysToDelete
        if (Array.isArray(parsedParentData.linkedPlanServices)) {
            for (const service of parsedParentData.linkedPlanServices) {
                if (service.objectId) {
                    const serviceKey = `resource:${service.objectId}`;
                    keysToDelete.push(serviceKey);

                    // Add LinkedService to keysToDelete
                    if (service.linkedService && service.linkedService.objectId) {
                        const childKeyService = `resource:${service.linkedService.objectId}`;
                        keysToDelete.push(childKeyService);
                    }

                    // Add PlanServiceCostShares to keysToDelete
                    if (service.planserviceCostShares && service.planserviceCostShares.objectId) {
                        const childKeyCostShare = `resource:${service.planserviceCostShares.objectId}`;
                        keysToDelete.push(childKeyCostShare);
                    }
                }
            }
        }

        // Delete all the keys collected
        for (const key of keysToDelete) {
            await client.del(key);
            console.log(`Deleted data for key: ${key}`);
        }

    } catch (err) {
        console.error('Error deleting data:', err);
    }
}


async function deleteAllData() {
    await connectRedis();

    try {
        // Get all keys related to the resources (assuming they are prefixed with 'resource:')
        const keys = await client.keys('resource:*');
        if (keys.length > 0) {
            await client.del(keys);
        }
        console.log('All resource data deleted from Redis');
    } catch (err) {
        console.error('Error deleting all data from Redis:', err);
        throw new Error('Error deleting all data from Redis');
    }
}
// Gracefully handle shutdown
process.on('SIGINT', () => {
   client.quit(() => {
       console.log('Redis client disconnected');
       process.exit(0);
   });
});

module.exports = { setParentChildData, getParentChildData, deleteParentChildData,deleteAllData };
