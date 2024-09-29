# ElasticSearch-RESTAPI-Kibana//brew tap elastic/tap
//brew install elastic/tap/elasticsearch-full
//brew services start elastic/tap/elasticsearch-full
//export JAVA_HOME=$(/usr/libexec/java_home -v 22)
//export PATH=$JAVA_HOME/bin:$PATH
//elasticsearch- to verify the running status
//brew install rabbitmq 
//brew services start rabbitmq
//brew install redis
//brew services start redis
//redis-cli ping - to check if redis is running
//brew services list - to check the services running
//sudo spctl --master-disable - to disable the security settings
//sudo spctl --master-enable - to enable the security settings
// RedisInsight Kibana RabbitMQ Management Plugin

//elastic
//s_R_zyMVEMNTFk43tq0v

//guest and guest rabbitmq

//curl -u elastic:s_R_zyMVEMNTFk43tq0v -X GET "https://localhost:9200"

//curl -k -u elastic:s_R_zyMVEMNTFk43tq0v https://localhost:9200

//redis-cli GET resource:12xvxc345ssdsds-508

//NODE_TLS_REJECT_UNAUTHORIZED=0 node server.js

//bin/elasticsearch
//bin/kibana
//1. Auth.js needs to be up
//2. Request JWT token from Auth.js and put in the header put it in jwtAuth.js for verififcation
//3. Make ElasticSearch and redis up and running
//4. Make the express server up
//5. Hit the post request to /api/v1/resource with the JWT token in the header

//AAEAAWVsYXN0aWMva2liYW5hL215LXRva2VuLW5hbWU6UllkWTUwXzVUeE94dWE5bGxQNXdCZw


//curl -k -X GET "https://localhost:9200/_cat/indices?v" -u elastic:s_R_zyMVEMNTFk43tq0v