import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  AccountConfigurationDetailsDto,
  TwitterConfigurationDto,
} from './post-configurations.dto';

for (const dto of [TwitterConfigurationDto, AccountConfigurationDetailsDto]) {
  describe(`${dto.name} X disclosures`, () => {
    for (const field of ['made_with_ai', 'paid_partnership'] as const) {
      it.each([true, false, undefined])(
        `accepts ${field}=%s without changing its value`,
        async (value) => {
          const input = value === undefined ? {} : { [field]: value };
          const config = plainToInstance(dto, input);
          expect(await validate(config)).toEqual([]);
          expect(config[field]).toBe(value);
        },
      );

      it.each(['true', 'false', 0, 1, {}, []])(
        `rejects non-boolean ${field}=%s`,
        async (value) => {
          const errors = await validate(
            plainToInstance(dto, { [field]: value }),
          );
          expect(errors).toEqual([
            expect.objectContaining({
              property: field,
              constraints: { isBoolean: `${field} must be a boolean value` },
            }),
          ]);
        },
      );
    }
  });
}
