import { ApiProperty } from "@nestjs/swagger";

export class StripeWebhookBodyDto {
  @ApiProperty({ type: "string", format: "binary", required: false })
  rawBody?: Buffer;
}
