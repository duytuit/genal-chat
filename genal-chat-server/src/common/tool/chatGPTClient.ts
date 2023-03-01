import { Injectable } from '@nestjs/common';
import { fetchEventSource } from '@waylaidwanderer/fetch-event-source';
import { encode as gptEncode } from 'gpt-3-encoder';
import Keyv from 'keyv';
import { v4 as uuidv4 } from 'uuid';

const CHATGPT_MODEL = 'text-davinci-003';
@Injectable()
export class ChatGPTClient {
    apiKey:string;
    options;
    modelOptions={
        model: CHATGPT_MODEL,
        temperature:  0.8,
        top_p: 1,
        presence_penalty: 1,
        max_tokens:0,
        prompt:''
    };
    maxContextTokens=4097;
    maxPromptTokens=3097;
    maxResponseTokens=1000;
    userLabel='User';
    chatGptLabel='ChatGPT';
    endToken= '<|im_end|>';
    separatorToken = '<|im_sep|>';
    conversationsCache;
    _error;
    cacheOptions;
    constructor(
    ) {
        // this.cacheOptions.namespace = 'chatgpt';
        // this.conversationsCache = new Keyv(this.cacheOptions);
    }
  
    async getCompletion(prompt, onProgress) {
        const modelOptions = { ...this.modelOptions };
        let stream = false;
        if (typeof onProgress === 'function') {
             stream = true;
        }
        modelOptions.prompt = prompt;
        const debug = this.options.debug;
        const url = this.options.reverseProxyUrl || 'https://api.openai.com/v1/completions';
        if (debug) {
            console.debug();
            console.debug(url);
            console.debug(modelOptions);
            console.debug();
        }
        const opts = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(modelOptions),
            bodyTimeout: 0,
            headersTimeout: 3 * 60 * 1000,
        };
        if (stream) {
            return new Promise(async (resolve, reject) => {
                const controller = new AbortController();
                try {
                    let done = false;
                    await fetchEventSource(url, {
                        ...opts,
                        signal: controller.signal,
                        async onopen(response) {
                            if (response.status === 200) {
                                return;
                            }
                            if (debug) {
                                console.debug(response);
                            }
                            let error;
                            try {
                                const body = await response.text();
                                error = new Error(`Failed to send message. HTTP ${response.status} - ${body}`);
                                error.status = response.status;
                                error.json = JSON.parse(body);
                            } catch {
                                error = error || new Error(`Failed to send message. HTTP ${response.status}`);
                            }
                            throw error;
                        },
                        onclose() {
                            if (debug) {
                                console.debug('Server closed the connection unexpectedly, returning...');
                            }
                            // workaround for private API not sending [DONE] event
                            if (!done) {
                                onProgress('[DONE]');
                                controller.abort();
                                resolve('oke');
                            }
                        },
                        onerror(err) {
                            if (debug) {
                                console.debug(err);
                            }
                            // rethrow to stop the operation
                            throw err;
                        },
                        onmessage(message) {
                            if (debug) {
                                console.debug(message);
                            }
                            if (!message.data || message.event === 'ping') {
                                return;
                            }
                            if (message.data === '[DONE]') {
                                onProgress('[DONE]');
                                controller.abort();
                                resolve('oke');
                                done = true;
                                return;
                            }
                            onProgress(JSON.parse(message.data));
                        },
                    });
                } catch (err) {
                    reject(err);
                }
            });
        }
        const response = await fetch(url, opts);
        if (response.status !== 200) {
            const body = await response.text();
            const error = new Error(`Failed to send message. HTTP ${response.status} - ${body}`);
            this._error.status =response.status;
            try {
                this._error.json = JSON.parse(body);
            } catch {
                this._error.body = body;
            }
            throw this._error;
        }
        let result = response.json();
        console.log(result);
        return result;
    }

    async sendMessage(
        message,
        opts,
    ) {
        const conversationId = opts.conversationId || uuidv4();
        const parentMessageId = opts.parentMessageId || uuidv4();

        let conversation = await this.conversationsCache.get(conversationId);
        if (!conversation) {
            conversation = {
                messages: [],
                createdAt: Date.now(),
            };
        }

        const userMessage = {
            id: uuidv4(),
            parentMessageId,
            role: 'User',
            message,
        };

        conversation.messages.push(userMessage);

        const prompt = await this.buildPrompt(conversation.messages, userMessage.id);

        let reply = '';
        let result = null;
        if (typeof opts.onProgress === 'function') {
            await this.getCompletion(prompt, (message) => {
                if (message === '[DONE]') {
                    return;
                }
                const token = message.choices[0].text;
                if (this.options.debug) {
                    console.debug(token);
                }
                if (token === this.endToken) {
                    return;
                }
                opts.onProgress(token);
                reply += token;
            });
        } else {
            result = await this.getCompletion(prompt, null);
            if (this.options.debug) {
                console.debug(JSON.stringify(result));
            }
            reply = result.choices[0].text.replace(this.endToken, '');
        }

        // avoids some rendering issues when using the CLI app
        if (this.options.debug) {
            console.debug();
        }

        reply = reply.trim();

        const replyMessage = {
            id: uuidv4(),
            parentMessageId: userMessage.id,
            role: 'ChatGPT',
            message: reply,
        };
        conversation.messages.push(replyMessage);

        await this.conversationsCache.set(conversationId, conversation);

        return {
            response: replyMessage.message,
            conversationId,
            messageId: replyMessage.id,
            details: result,
        };
    }

    async buildPrompt(messages, parentMessageId) {
        const orderedMessages = this.getMessagesForConversation(messages, parentMessageId);

        let promptPrefix;
        if (this.options.promptPrefix) {
            promptPrefix = this.options.promptPrefix.trim();
            // If the prompt prefix doesn't end with the separator token, add it.
            if (!promptPrefix.endsWith(`${this.separatorToken}\n\n`)) {
                promptPrefix = `${promptPrefix.trim()}${this.separatorToken}\n\n`;
            }
            promptPrefix = `\n${this.separatorToken}Instructions:\n${promptPrefix}`;
        } else {
            const currentDateString = new Date().toLocaleDateString(
                'en-us',
                { year: 'numeric', month: 'long', day: 'numeric' },
            );

            promptPrefix = `\n${this.separatorToken}Instructions:\nYou are ChatGPT, a large language model trained by OpenAI.\nCurrent date: ${currentDateString}${this.separatorToken}\n\n`
        }

        const promptSuffix = `${this.chatGptLabel}:\n`; // Prompt ChatGPT to respond.

        let currentTokenCount = this.getTokenCount(`${promptPrefix}${promptSuffix}`);
        let promptBody = '';
        const maxTokenCount = this.maxPromptTokens;
        // Iterate backwards through the messages, adding them to the prompt until we reach the max token count.
        while (currentTokenCount < maxTokenCount && orderedMessages.length > 0) {
            const message = orderedMessages.pop();
            const roleLabel = message.role === 'User' ? this.userLabel : this.chatGptLabel;
            const messageString = `${roleLabel}:\n${message.message}${this.endToken}\n`;
            let newPromptBody;
            if (promptBody) {
                newPromptBody = `${messageString}${promptBody}`;
            } else {
                // Always insert prompt prefix before the last user message.
                // This makes the AI obey the prompt instructions better, which is important for custom instructions.
                // After a bunch of testing, it doesn't seem to cause the AI any confusion, even if you ask it things
                // like "what's the last thing I wrote?".
                newPromptBody = `${promptPrefix}${messageString}${promptBody}`;
            }

            // The reason I don't simply get the token count of the messageString and add it to currentTokenCount is because
            // joined words may combine into a single token. Actually, that isn't really applicable here, but I can't
            // resist doing it the "proper" way.
            const newTokenCount = this.getTokenCount(`${promptPrefix}${newPromptBody}${promptSuffix}`);
            if (newTokenCount > maxTokenCount) {
                if (promptBody) {
                    // This message would put us over the token limit, so don't add it.
                    break;
                }
                // This is the first message, so we can't add it. Just throw an error.
                throw new Error(`Prompt is too long. Max token count is ${maxTokenCount}, but prompt is ${newTokenCount} tokens long.`);
            }
            promptBody = newPromptBody;
            currentTokenCount = newTokenCount;
        }

        const prompt = `${promptBody}${promptSuffix}`;

        const numTokens = this.getTokenCount(prompt);
        // Use up to `this.maxContextTokens` tokens (prompt + response), but try to leave `this.maxTokens` tokens for the response.
        this.modelOptions.max_tokens = Math.min(this.maxContextTokens - numTokens, this.maxResponseTokens);

        return prompt;
    }

    getTokenCount(text) {
        if (this.modelOptions.model === CHATGPT_MODEL) {
            // With this model, "<|im_end|>" and "<|im_sep|>" is 1 token, but tokenizers aren't aware of it yet.
            // Replace it with "<|endoftext|>" (which it does know about) so that the tokenizer can count it as 1 token.
            text = text.replace(/<\|im_end\|>/g, '<|endoftext|>');
            text = text.replace(/<\|im_sep\|>/g, '<|endoftext|>');
        }
        return gptEncode(text).length;
    }

    /**
     * Iterate through messages, building an array based on the parentMessageId.
     * Each message has an id and a parentMessageId. The parentMessageId is the id of the message that this message is a reply to.
     * @param messages
     * @param parentMessageId
     * @returns {*[]} An array containing the messages in the order they should be displayed, starting with the root message.
     */
    getMessagesForConversation(messages, parentMessageId) {
        const orderedMessages = [];
        let currentMessageId = parentMessageId;
        while (currentMessageId) {
            const message = messages.find((m) => m.id === currentMessageId);
            if (!message) {
                break;
            }
            orderedMessages.unshift(message);
            currentMessageId = message.parentMessageId;
        }

        return orderedMessages;
    }
}
