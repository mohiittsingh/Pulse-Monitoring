import { SendMessageCommand } from "@aws-sdk/client-sqs";
import sqsClient from "../config/sqs";
import { command } from './../../node_modules/@aws-sdk/client-sqs/dist-es/commandBuilder';
 export const SendMonitorJob=async(monitor)=>{
    const message={
        monitorId:monitor.id,
        url:monitor.url

    };
    const command= new SendMessageCommand({
        QueueUrl:process.env.QueueUrl,
        MessageBody:JSON.stringify(message)
    });
    const response= await sqsClient.send(command);

    console.log(
        `[sqs] Job sent successfully. MessageId: ${response.MessageId}`
    );
 };