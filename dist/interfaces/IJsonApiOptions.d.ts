import IDictionary from './IDictionary';
interface IJsonApiOptions {
    include?: string | Array<string>;
    fields?: IDictionary<string | Array<string>>;
}
export default IJsonApiOptions;
