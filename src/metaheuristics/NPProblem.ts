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

/**
 * Sets the qualities for a Non-deterministic Polynomial Problem instance.
 * T represents the solution structure, which may be a permutation, a
 * bitset, etc.
 */
export abstract class NPProblem<T> {
  /**
   * Determines whether s is feasible or not.
   * @param s Solution to test.
   * @returns true if s is a feasible solution, false otherwise.
   */
  abstract validate(s: T): boolean;

  /**
   * Calculates the value of a solution provided.
   * @param s The solution from which value will be calculated.
   * @returns The value of the given solution.
   */
  abstract value(s: T): number;

  /**
   * Generates a solution for this problem.
   * @returns A solution for this.
   */
  abstract generate(): T;

  /**
   * Crossovers two solutions provided to generated children solutions with
   * features inherited from the two parents.
   * @param a The first parent.
   * @param b The second parent.
   * @returns The children generated from: a x b.
   */
  abstract crossover(a: T, b: T): T[];

  /**
   * Mutates s to generate n neighbors/mutations.
   * @param s The solution to mutate.
   * @param vRate Defines how much s can differ from their mutations.
   * @param n The number of mutations wanted to be generate.
   * @returns n mutations of s.
   */
  abstract mutate(s: T, vRate?: number, n?: number): T[];

  /**
   * The problem size.
   * @returns The size of the problem.
   */
  abstract get n(): number;

  /**
   * Compares two solutions. Default criterion is solutions with lower value
   * are better.
   * @param a The first solution.
   * @param b The second solution.
   * @returns 1 if a is better than b, -1 if b is better than a, 0 if
   * they're equals.
   */
  compare(a: T, b: T): number {
    const aV = this.value(a);
    const bV = this.value(b);
    if (aV < bV) {
      return 1;
    } else if (bV < aV) {
      return -1;
    } else {
      return 0;
    }
  }
}
