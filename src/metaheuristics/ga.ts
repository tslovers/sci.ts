/**
 * @author Hector J. Vasquez <ipi.vasquez@gmail.com>
 *
 * @licence
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {BitSet} from 'std.ts';
import {randInt} from '../discrete/integers';

/**
 * Two point crossover operator for genetic algorithms based on binary strings.
 * @param a The first parent.
 * @param b The second parent.
 * @param xFactor The factor of change which children will inherit from one
 * parent.
 * @returns The children of a and b. The children on result will be an one
 * parent based string of bits with (a.size * xFactor) of the other
 * parent elements.
 */
export function tpx(a: BitSet, b: BitSet, xFactor = 0.5): BitSet[] {
  // Copy a & b
  const ab = new BitSet(a.size, a.buffer);
  const ba = new BitSet(b.size, b.buffer);

  const x = randInt(0, a.size);
  const distance = Math.ceil(a.size * xFactor);

  for (let i = 0; i < distance; i++) {
    let bit = (x + i) % a.size;
    ab.set(bit, b.get(bit));
    ba.set(bit, a.get(bit));
  }

  return [ab, ba];
}
