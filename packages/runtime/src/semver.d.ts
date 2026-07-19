declare module "semver" {
  interface SemverApi {
    valid(value: string | undefined): string | null
    lte(left: string, right: string): boolean
    eq(left: string, right: string): boolean
  }
  const semver: SemverApi
  export default semver
}
