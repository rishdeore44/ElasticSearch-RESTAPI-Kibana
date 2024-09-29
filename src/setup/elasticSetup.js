const { Client } = require('@elastic/elasticsearch');
// const esClient = new Client({ node: 'http://localhost:9200' });

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

const createIndexWithMapping = async () => {
    try {
        await esClient.indices.create({
            index: 'resources',
            body: {
                mappings: {
                    properties: {
                        relation: {
                            type: 'join',
                            relations: {
                                plan: ["linkedPlanServices", "planCostShares"],
                                linkedPlanServices: ["linkedService", "planserviceCostShares"]
                            }
                        },
                        planType: { type: 'keyword' },
                        creationDate: { type: 'date' },
                        objectType: { type: 'keyword' },
                        _org: { type: 'keyword' },
                        linkedPlanServices: {
                            type: 'nested',
                            properties: {
                                linkedService: {
                                    type: 'nested',
                                    properties: {
                                        objectId: { type: 'keyword' },
                                        objectType: { type: 'keyword' },
                                        _org: { type: 'keyword' },
                                        name: { type: 'text' }
                                    }
                                },
                                planserviceCostShares: {
                                    type: 'nested',
                                    properties: {
                                        objectId: { type: 'keyword' },
                                        objectType: { type: 'keyword' },
                                        _org: { type: 'keyword' },
                                        deductible: { type: 'float' },
                                        copay: { type: 'float' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        console.log('Index with mapping created successfully');
    } catch (err) {
        console.error('Error creating index with mapping:', err);
    }
};

createIndexWithMapping();