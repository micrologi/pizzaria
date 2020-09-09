// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

class Pizzaria extends ActivityHandler {
    
    constructor() {
        super();
        
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            const replyText = `Repetindo: ${ context.activity.text }`;            
            await context.sendActivity(MessageFactory.text(replyText, replyText));
            
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });


        this.onMembersAdded(async (context, next) => {
            await this.sendMensagemBoasVindas(context); 

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }


    async sendMensagemBoasVindas(turnContext) {
        const {activity} = turnContext;

        for (const idx in activity.membersAdded) {
            if (activity.membersAdded[idx].id !== activity.recipient.id) {
                //console.log(`4`);
                const bemvindoMensagem = `Bem vindo a pizzaria ${ activity.membersAdded[idx].name }.`;
                await turnContext.sendActivity(bemvindoMensagem);
                await this.sendAcoesSugeridas(turnContext);
            }
        }
    }

    async sendAcoesSugeridas(turnContext) {
        var resposta = MessageFactory.suggestedActions(['Pedir uma pizza', 'Cancelar um Pedido', 'Saber o endereço da pizzaria'],'O que gostaria de fazer?');
        await turnContext.sendActivity(resposta);
    }

}

module.exports.Pizzaria = Pizzaria;
