const { Client } = require('@elastic/elasticsearch');
//const esClient = new Client({ node: 'https://localhost:9200' });
// const fs = require('fs');

const esClient = new Client({
    node: 'https://localhost:9200',
    auth: {
      username: 'elastic', 
      password: 'abc'
    },
    ssl: {
        // ca: fs.readFileSync(''),
        rejectUnauthorized: false  
      }
  });


// Check Elasticsearch Connection
esClient.ping({}, function (error) {
    if (error) {
        console.error('Elasticsearch cluster is down!', error);
    } else {
        console.log('Elasticsearch cluster is up and running.');
    }
});

// Index parent document
async function indexParentChildData(id, data, isPatch = false) {
    try {
        // Retrieve existing data if patching
        let existingData = {};
        if (isPatch) {
            try {
                const existingResponse = await esClient.get({
                    index: 'resources',
                    id: id
                });
                existingData = existingResponse._source;
            } catch (err) {
                if (err.meta && err.meta.statusCode === 404) {
                    // If the document doesn't exist, handle it as a new document
                    existingData = {};
                } else {
                    throw err;
                }
            }
        }

        // Index the parent document (Plan)
        const parentData = {
            ...(!isPatch ? {} : existingData),
            planType: data.planType,
            creationDate: data.creationDate,
            relation: { name: "plan" }  // Use "plan" as defined in the mapping
        };
        await esClient.index({
            index: 'resources',
            id: id,
            body: parentData,
            refresh: true,
        });

        // Index the plan's cost share (as a child to the Plan)
        const costShareData = {
            ...(!isPatch ? {} : existingData.planCostShares || {}),
            ...data.planCostShares,
            relation: {
                name: "planCostShares",  // Use "planCostShares" as defined in the mapping
                parent: id
            }
        };
        await esClient.index({
            index: 'resources',
            id: data.planCostShares.objectId,
            body: costShareData,
            routing: id,
            refresh: true,
        });

        // Index each LinkedPlanServices (itself as a child to the Plan)
        const mergedLinkedPlanServices = isPatch
            ? mergeLinkedPlanServices(existingData.linkedPlanServices || [], data.linkedPlanServices || [])
            : data.linkedPlanServices;

        for (const service of mergedLinkedPlanServices) {
            // Index the LinkedPlanServices as a child of Plan
            const serviceData = {
                ...(!isPatch ? {} : existingData.linkedPlanServices?.find(s => s.objectId === service.objectId) || {}),
                _org: service._org,
                objectType: service.objectType,
                relation: {
                    name: "linkedPlanServices",  // Use "linkedPlanServices" as defined in the mapping
                    parent: id
                }
            };
            await esClient.index({
                index: 'resources',
                id: service.objectId,
                body: serviceData,
                routing: id,
                refresh: true,
            });

            // Index the LinkedService as a child of LinkedPlanServices
            const linkedServiceData = {
                ...(!isPatch ? {} : existingData.linkedPlanServices?.find(s => s.objectId === service.objectId)?.linkedService || {}),
                ...service.linkedService,
                relation: {
                    name: "linkedService",  // Use "linkedService" as defined in the mapping
                    parent: service.objectId
                }
            };
            await esClient.index({
                index: 'resources',
                id: service.linkedService.objectId,
                body: linkedServiceData,
                routing: service.objectId,
                refresh: true,
            });

            // Index the PlanServiceCostShares as a child of LinkedPlanServices
            const planServiceCostSharesData = {
                ...(!isPatch ? {} : existingData.linkedPlanServices?.find(s => s.objectId === service.objectId)?.planserviceCostShares || {}),
                ...service.planserviceCostShares,
                relation: {
                    name: "planserviceCostShares",  // Use "planserviceCostShares" as defined in the mapping
                    parent: service.objectId
                }
            };
            await esClient.index({
                index: 'resources',
                id: service.planserviceCostShares.objectId,
                body: planServiceCostSharesData,
                routing: service.objectId,
                refresh: true,
            });
        }

        console.log('Parent and child documents indexed successfully in Elasticsearch');
    } catch (err) {
        console.error('Error indexing parent and child documents in Elasticsearch:', err.meta.body.error || err.message);
        throw new Error('Error indexing parent and child documents in Elasticsearch');
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
            // If the service exists, merge the data
            mergedServices[existingServiceIndex] = {
                ...mergedServices[existingServiceIndex],
                ...newService
            };
        }
    }

    return mergedServices;
}


// Example search by parent
// async function searchByParent(parentId) {
//     try {
//         const response = await esClient.search({
//             index: 'resources',
//             body: {
//                 query: {
//                     has_parent: {
//                         parent_type: "parent",
//                         query: { match: { _id: parentId } }
//                     }
//                 }
//             }
//         });
//         console.log('Search results:', response.hits.hits);
//     } catch (err) {
//         console.error('Error searching by parent in Elasticsearch:', err.meta.body.error || err.message);
//         throw new Error('Error searching by parent in Elasticsearch');
//     }
// }


async function deleteData(id) {
    try {
        const response = await esClient.delete({
            index: 'resources',
            id: id,
        });

        console.log(`Document with id ${id} deleted successfully.`);
        return response;
    } catch (err) {
        if (err.meta && err.meta.statusCode === 404) {
            console.log(`Document with id ${id} does not exist in Elasticsearch.`);
        } else {
            console.error('Error deleting data from Elasticsearch:', err);
            throw new Error('Error deleting data from Elasticsearch');
        }
    }
}

async function deleteAllData() {
    try {
        // Delete all documents from the 'resources' index
        await esClient.deleteByQuery({
            index: 'resources',
            body: {
                query: {
                    match_all: {}
                }
            },
            refresh: true
        });

        console.log('All resource data deleted from Elasticsearch');
    } catch (err) {
        console.error('Error deleting all data from Elasticsearch:', err.meta.body.error || err.message);
        throw new Error('Error deleting all data from Elasticsearch');
    }
}

// async function searchByChild(parentId) {
//     try {
//         const response = await esClient.search({
//             index: 'resources',
//             body: {
//                 query: {
//                     has_child: {
//                         type: "child",
//                         query: {
//                             match: {
//                                 _parent: parentId
//                             }
//                         }
//                     }
//                 }
//             }
//         });
//         console.log('Search results for children:', response.hits.hits);
//     } catch (err) {
//         console.error('Error searching by child in Elasticsearch:', err.meta.body.error || err.message);
//         throw new Error('Error searching by child in Elasticsearch');
//     }
// }

module.exports = { 
    indexParentChildData, 
    // searchByParent,
    // searchByChild,
    deleteAllData,
    deleteData 
};