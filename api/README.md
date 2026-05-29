## 📦 Entidades do Sistema - DynamoDB Single Table

### User
Representa um usuário.

| Atributo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `PK` | PK | Sim | USER#<id> |
| `SK` | SK | Sim | PROFILE |
| `id`| String | Sim | usr_<UUID>|
| `username`| String | Sim | Username do usuário |
| `password` | String | Sim | Hash password |
| `email` | String | Sim | Email do usuário |

### Scheduler
Representa um alarme.

| Atributo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `PK` | PK | Sim | USER#<user_id> |
| `SK` | SK | Sim | SCHEDULER#<id> |
| `id`| String | Sim | UUID do Scheduler |
| `name`| String | Sim | Nome do scheduler |
| `weekdays` | [String] | Sim | Lista contendo dias da semana pro scheduler |
| `start_time` | String | Sim | Quando vai dsiparar |
| `snooze_duration` | String | Sim | Tempo de cochilo |
| `sound` | String | Sim | Referência do som no dispositivo |
| `object_ids` | [String] | Sim | Lista que contém nomes dos objetos contextualizados |
| `enabled` | bool | Sim | Desativa/Ativa |

### Object
Representa qualquer item inserido do usuário, seja PDF, txt md. Exemplo: key = tenants/joaoleau2/context/dhcp.pdf ; name = dhcp.pdf

| Atributo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `PK` | PK | Sim | USER#<user_id> |
| `SK` | SK | Sim | OBJECT#<id> |
| `id`| String | Sim | (UUID) ID do Object |
| `key`| String | Sim | Referência do objeto no S3 |
| `name` | String | Sim | Nome do objeto, ou seja, de fato o nome do upload|
| `user_id` | String | Sim | <user_id> do proprietário |
| `tags` | String | Sim | Palavras que enriquecem o contexto de retrieve |
| `status` | String | Sim | Status de processamento do objeto |

### SchedulerObjectLink
Representa uma entidade auxiliar de relacionamento entre Scheduler e Object.

Essa entidade existe para permitir reverse lookup eficiente, possibilitando descobrir rapidamente quais schedulers utilizam determinado object sem necessidade de percorrer toda a partição do usuário.

Também resolve problemas de consistência durante remoção de objetos, permitindo localizar todos os schedulers relacionados e remover automaticamente a referência daquele object.

| Atributo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `PK` | PK | Sim | USER#<user_id> |
| `SK` | SK | Sim | OBJECTLINK#<object_id>#SCHEDULER#<scheduler_id> |
| `object_id` | String | Sim | ID do Object relacionado |
| `scheduler_id` | String | Sim | ID do Scheduler relacionado |

#### Exemplo

| PK | SK |
| :--- | :--- |
| USER#joao | OBJECTLINK#obj-123#SCHEDULER#sched-456 |


## 📦 Entidades do Sistema - S3 Vector

### VectorObject
Representa chunk vetorizado de um objeto contextualizado

| Atributo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `vector_id`| String | Sim | (UUID) que será atrelado a Key (ID de vetor no S3 Vector) |
| `user`| String | Sim | <username> do usuário pra fazer multi tenant no S3 vector |
| `object_key`| String | Sim | Referência do objeto no S3 |
| `page` | String | Sim | Página onde estava o chunk |
| `chunk_index` | String | Sim | Index do chunk naquela página |


## Fluxos - Upload Object
1. Mobile envia solicitação para a lambda API informando que deseja fazer upload do <object_name> no S3;
2. Lambda API Processa solicitação e gera Presing URL e responde ao Mobile;
3. Mobile utilza da Presign URL para fazer upload direto no S3, sem passar por um processamento prévio; 
4. S3 lança um evento de <ObjectCreate> para um fila SQS;
5. Fila SQS trigga lambda Processor, por tanto ela realiza:
    5.1 Cria metadata inicial do Object no DynamoDB com status=PROCESSING;
    5.1 Valida a extensão do documento (txt, md ou PDF);
    5.2 Abre o documento e processa chunks baseados em <chunk_size>;
    5.3 Cada chunk é checado o idioma atrelado e também obtido utilizando Yake as tags (keywords) de maiores scores no chunk;
    5.4 Faz embedding de chunk utilizando Amazon Titan;
    5.5 Para cada chunk:
        - Detecta idioma;
        - Extrai keywords utilizando YAKE;
        - Gera embedding utilizando Amazon Titan;
        - Salva embedding no S3 Vector com metadados:
            - vector_id (key)
            - user_id
            - object_key
            - page
            - chunk_index
            - language
    5.6 Dado que todo o objeto foi processado, insere no DynamoDB novo Object passando: object_id, key, name e tags. E altera status=READY
    5.7 Caso ocorra falha durante processamento:
        - Atualiza status para FAILED;
        - Salva mensagem de erro para troubleshooting;
        - Finaliza processamento.

## Fluxos - Delete Object
1. Mobile envia solicitação para a lambda API informando que deseja fazer delete do <object_id>;
2. Lambda API processa solicitação e gera Presigned URL para remoção do objeto no S3;
3. Mobile utiliza da Presigned URL para realizar delete diretamente no S3, sem passar pela API;
4. S3 lança evento <ObjectDelete> para fila SQS;
5. Fila SQS trigga lambda Processor, portanto ela realiza:
    5.1 Recupera <object_id> no DynamoDB;
    5.2 Realiza Query na tabela utilizando:
        PK = USER#<user_id>
        begins_with(SK, OBJECTLINK#<object_id>)
    5.3 Para cada relacionamento encontrado:
        - Recupera scheduler_id;
        - Atualiza Scheduler removendo object_id do atributo object_ids;
        - Remove item SchedulerObjectLink relacionado;
    5.4 Realiza busca de vetores relacionados no S3 Vector utilizando filtros:
        - user
        - object_key
    5.5 Recupera lista de vector_ids relacionados ao documento;
    5.6 Remove todos vetores relacionados através do método delete_vectors;
    5.7 Remove Object no DynamoDB;
    5.8 Remove objeto do bucket S3 caso ainda exista;
    5.9 Finaliza processamento.

## Fluxos - RAG
1. Mobile scheduler é disparado, faz requisição POST (com scheduler_id) na lambda RAG /retrieve-and-generate;
2. Lambda RAG recebe solicitação e processa:
    //Retrieve
    2.1 Consulta DynamoDB Scheduler <scheduler_id>, recupera object_ids aleatório;
    2.2 Consulta DynamoDB Object <object_id>, recupera tag aleatória;
    2.3 Elabora input query com tag (para enriquecer retrieve);
    2.4 Faz embedding do input query;
    2.5 Faz retrieve semantico de embedding de input query, e passa filtros de <object_key> e <user>, utiliza do método query_vectors do boto3;
    2.6 Recebe topk chunks, e embaralha assim como escolhe conjunto aleatório;
    
    //Aumentaded and Generate
    2.7 Passa input referenciando formato JSON de retorno, chunks para serem utilizados, dessa forma, será gerado o quiz.
3. Lambda RAG tendo o quiz retorna para Mobile.