import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  AccountConfigurationDetailsDto,
  FacebookConfigurationDto,
} from './post-configurations.dto';

for (const dto of [FacebookConfigurationDto, AccountConfigurationDetailsDto]) {
  describe(`${dto.name} Facebook AI disclosure`, () => {
    it.each([true, false, undefined])(
      'accepts is_ai_generated=%s without changing its value',
      async (value) => {
        const input = value === undefined ? {} : { is_ai_generated: value };
        const config = (await new ValidationPipe({ transform: true }).transform(
          input,
          { type: 'body', metatype: dto },
        )) as InstanceType<typeof dto>;
        expect(config.is_ai_generated).toBe(value);
      },
    );
  });
}
