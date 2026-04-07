import { ISecurityEventEmitter, SecurityEventPayload, SecurityEventType } from '../../domain/interfaces/events/ISecurityEventEmitter';
import { EventEmitter } from 'events';

/**
 * Concrete implementation of the Security Event Emitter.
 * 
 * In a real enterprise system, this backend could pipe directly into 
 * AWS CloudWatch, Datadog, or an ELK stack.
 * For this system, we bind it to both a local Node EventEmitter (for 
 * within-process triggers) and format structured JSON console logs that 
 * external agents (like fluentd/logstash) can easily scrape.
 */
export class NodeSecurityEventEmitter implements ISecurityEventEmitter {
  private static instance: NodeSecurityEventEmitter;
  private readonly emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    this.setupListeners();
  }

  /**
   * Singleton pattern ensures we have central security bus
   */
  public static getInstance(): NodeSecurityEventEmitter {
    if (!NodeSecurityEventEmitter.instance) {
      NodeSecurityEventEmitter.instance = new NodeSecurityEventEmitter();
    }
    return NodeSecurityEventEmitter.instance;
  }

  /**
   * Attach default sinks and hooks for critical events
   */
  private setupListeners() {
    // Example: Alert internally when an account is locked out
    this.emitter.on(SecurityEventType.ACCOUNT_LOCKED, (payload: SecurityEventPayload) => {
      // Future: Send Slack/Email Alert to Security Ops team
      console.error(`🚨 [CRITICAL_SECURITY_ALERT] Account Lockout Triggered: \${payload.email}`);
    });
  }

  /**
   * Emits the structured payload natively
   */
  public emit(event: SecurityEventType, payload: SecurityEventPayload): void {
    // 1. Notify any runtime listeners (WebSockets, alert systems)
    this.emitter.emit(event, payload);

    // 2. Structured JSON logging (Standard Enterprise SIEM integration approach)
    const logEntry = JSON.stringify({
      eventType: event,
      ...payload,
      timestamp: payload.timestamp.toISOString(),
      level: event === SecurityEventType.SUCCESSFUL_LOGIN ? 'INFO' : 'WARN',
      source: 'auth-service'
    });

    if (event === SecurityEventType.SUCCESSFUL_LOGIN) {
      console.log(logEntry);
    } else {
      console.warn(logEntry);
    }
  }
}
